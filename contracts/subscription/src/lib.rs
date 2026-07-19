#![no_std]
//! StreamPay — a Soroban escrow contract for recurring (subscription-style)
//! payments.
//!
//! A **sender** locks funds into the contract and defines a `Schedule`: a fixed
//! `amount` of some `asset` paid to a `recipient` every `cadence_secs`, up to
//! `total_count` installments. Because Soroban contracts cannot self-execute, an
//! off-chain watcher (or the recipient) calls [`SubscriptionContract::pay_next`]
//! once each interval elapses. The sender can [`deposit`](SubscriptionContract::deposit)
//! more escrow, [`pause`](SubscriptionContract::pause) / [`resume`](SubscriptionContract::resume),
//! or [`cancel`](SubscriptionContract::cancel) (which refunds the remaining escrow).
//!
//! ## Security model
//! - Every state-changing call that acts on the sender's behalf requires
//!   [`Address::require_auth`] on the *stored* sender — the caller is never
//!   trusted to assert who the sender is.
//! - Double-withdrawal is prevented by two independent guards checked together
//!   in `pay_next`: a monotonic timestamp guard (`now >= last_paid_ts + cadence`)
//!   and an installment counter (`paid_count < total_count`).
//! - All balances are `i128`; the token contract enforces its own overflow and
//!   sufficiency rules on `transfer`, and `overflow-checks` is on in release.

use soroban_sdk::{
    contract, contracterror, contractevent, contractimpl, contracttype, token, Address, Env,
};

/// Lifecycle state of a schedule.
#[contracttype]
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Status {
    /// Accepting `pay_next` calls once due.
    Active = 0,
    /// Temporarily halted by the sender; `pay_next` is rejected until resumed.
    Paused = 1,
    /// Terminal: fully paid out or cancelled. No further payments.
    Ended = 2,
}

/// A single recurring-payment agreement. Mirrors the frontend `Schedule` type.
#[contracttype]
#[derive(Clone, Debug)]
pub struct Schedule {
    pub sender: Address,
    pub recipient: Address,
    /// Per-installment amount, in the asset's smallest unit (stroops for XLM).
    pub amount: i128,
    /// Token contract address of the asset being streamed.
    pub asset: Address,
    /// Seconds between eligible disbursements.
    pub cadence_secs: u64,
    /// Total number of installments the schedule will ever pay.
    pub total_count: u32,
    /// Installments paid so far. Invariant: `paid_count <= total_count`.
    pub paid_count: u32,
    /// Ledger timestamp of the last successful payment; 0 before the first.
    pub last_paid_ts: u64,
    /// Escrow remaining in the contract for this schedule, in smallest units.
    pub deposit: i128,
    pub status: Status,
    /// Ledger timestamp at creation; used as the cadence anchor before the
    /// first payment.
    pub created_ts: u64,
}

/// Storage keys. `Schedule(id)` holds each agreement; `Counter` is the
/// monotonically increasing id source.
#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    /// Next schedule id to hand out.
    Counter,
    /// A stored schedule, keyed by its id.
    Schedule(u64),
}

/// Errors returned to callers. Numeric codes are stable across the ABI.
#[contracterror]
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
#[repr(u32)]
pub enum Error {
    ScheduleNotFound = 1,
    /// `pay_next` called before `last_paid_ts + cadence_secs`.
    NotYetDue = 2,
    /// Escrow `deposit` is less than the per-installment `amount`.
    InsufficientDeposit = 3,
    /// All `total_count` installments have already been paid.
    AlreadyComplete = 4,
    /// Action requires the schedule to be `Active`.
    NotActive = 5,
    /// Action invalid for a terminal (`Ended`) schedule.
    AlreadyEnded = 6,
    /// A numeric argument was out of range (e.g. amount <= 0, count == 0).
    InvalidArgument = 7,
    /// Resume called on a schedule that is not `Paused`.
    NotPaused = 8,
}

// ---------------------------------------------------------------------------
// Events. Each is emitted with a stable topic so the watcher/indexer and the
// activity feed can subscribe by type.
// ---------------------------------------------------------------------------

/// Emitted by `init_schedule`.
#[contractevent(topics = ["created"])]
#[derive(Clone, Debug)]
pub struct Created {
    #[topic]
    pub schedule_id: u64,
    pub sender: Address,
    pub recipient: Address,
    pub amount: i128,
    pub cadence_secs: u64,
    pub total_count: u32,
}

/// Emitted by a successful `pay_next`.
#[contractevent(topics = ["payment"])]
#[derive(Clone, Debug)]
pub struct Payment {
    #[topic]
    pub schedule_id: u64,
    pub recipient: Address,
    pub amount: i128,
    /// Installment index just paid (1-based).
    pub paid_count: u32,
    pub ts: u64,
}

/// Emitted by `deposit`.
#[contractevent(topics = ["deposit"])]
#[derive(Clone, Debug)]
pub struct Deposited {
    #[topic]
    pub schedule_id: u64,
    pub amount: i128,
    /// New escrow balance after the top-up.
    pub new_deposit: i128,
}

/// Emitted by `cancel`, carrying the refunded remainder.
#[contractevent(topics = ["cancel"])]
#[derive(Clone, Debug)]
pub struct Cancelled {
    #[topic]
    pub schedule_id: u64,
    pub refund: i128,
}

/// Emitted by `pause` / `resume`.
#[contractevent(topics = ["status"])]
#[derive(Clone, Debug)]
pub struct StatusChanged {
    #[topic]
    pub schedule_id: u64,
    pub status: Status,
}

#[contract]
pub struct SubscriptionContract;

#[contractimpl]
impl SubscriptionContract {
    /// Create a new schedule and store it. Requires the sender's auth so a
    /// caller cannot open a stream that spends someone else's identity/escrow.
    ///
    /// Note: escrow starts at 0; the sender funds it via [`deposit`]. Returns
    /// the new schedule id.
    pub fn init_schedule(
        env: Env,
        sender: Address,
        recipient: Address,
        amount: i128,
        asset: Address,
        cadence_secs: u64,
        total_count: u32,
    ) -> Result<u64, Error> {
        sender.require_auth();

        // Reject nonsensical parameters up front so bad schedules never persist.
        if amount <= 0 || total_count == 0 || cadence_secs == 0 {
            return Err(Error::InvalidArgument);
        }

        let id = Self::next_id(&env);
        let now = env.ledger().timestamp();

        let schedule = Schedule {
            sender: sender.clone(),
            recipient: recipient.clone(),
            amount,
            asset,
            cadence_secs,
            total_count,
            paid_count: 0,
            last_paid_ts: 0,
            deposit: 0,
            status: Status::Active,
            created_ts: now,
        };
        Self::save(&env, id, &schedule);

        Created {
            schedule_id: id,
            sender,
            recipient,
            amount,
            cadence_secs,
            total_count,
        }
        .publish(&env);

        Ok(id)
    }

    /// Top up the escrow for a schedule. Pulls `amount` of the schedule's asset
    /// from the sender into the contract. Requires the sender's auth (which
    /// also authorizes the token `transfer` below via the same tree).
    pub fn deposit(env: Env, schedule_id: u64, amount: i128) -> Result<(), Error> {
        if amount <= 0 {
            return Err(Error::InvalidArgument);
        }
        let mut s = Self::load(&env, schedule_id)?;
        s.sender.require_auth();
        if s.status == Status::Ended {
            return Err(Error::AlreadyEnded);
        }

        // Move funds sender -> contract. The token client enforces the sender's
        // balance; require_auth above authorizes this transfer for `sender`.
        let client = token::TokenClient::new(&env, &s.asset);
        client.transfer(&s.sender, &env.current_contract_address(), &amount);

        s.deposit += amount;
        Self::save(&env, schedule_id, &s);

        Deposited {
            schedule_id,
            amount,
            new_deposit: s.deposit,
        }
        .publish(&env);

        Ok(())
    }

    /// Disburse the next installment to the recipient.
    ///
    /// Callable by anyone (the off-chain watcher or the recipient) — no
    /// `require_auth` — because it can only ever move funds along the terms the
    /// sender already committed to, and only when genuinely due. Safety rests on
    /// the two guards below, not on who calls it.
    ///
    /// Guards, all required:
    /// 1. `status == Active`
    /// 2. `paid_count < total_count`            (installment cap)
    /// 3. `deposit >= amount`                   (escrow sufficiency)
    /// 4. `now >= anchor + cadence_secs`        (timing / anti-double-withdraw)
    ///
    /// where `anchor = last_paid_ts` once any payment has been made, else
    /// `created_ts`. On success it transfers `amount` to the recipient, advances
    /// `paid_count`, sets `last_paid_ts = now`, decrements `deposit`, and ends
    /// the schedule when the final installment is paid.
    pub fn pay_next(env: Env, schedule_id: u64) -> Result<(), Error> {
        let mut s = Self::load(&env, schedule_id)?;

        if s.status != Status::Active {
            return Err(Error::NotActive);
        }
        if s.paid_count >= s.total_count {
            return Err(Error::AlreadyComplete);
        }
        if s.deposit < s.amount {
            return Err(Error::InsufficientDeposit);
        }

        let now = env.ledger().timestamp();
        let anchor = if s.last_paid_ts > 0 {
            s.last_paid_ts
        } else {
            s.created_ts
        };
        // Saturating add keeps the guard sound even if a caller set an absurd
        // cadence; an overflowed due-time simply stays in the future.
        let due = anchor.saturating_add(s.cadence_secs);
        if now < due {
            return Err(Error::NotYetDue);
        }

        // Effects before interaction on our own state: decrement escrow and
        // advance counters, then transfer. Re-entrancy can't replay because the
        // counters/timestamp are already advanced in storage on the next load.
        s.deposit -= s.amount;
        s.paid_count += 1;
        s.last_paid_ts = now;
        if s.paid_count == s.total_count {
            s.status = Status::Ended;
        }
        Self::save(&env, schedule_id, &s);

        let client = token::TokenClient::new(&env, &s.asset);
        client.transfer(&env.current_contract_address(), &s.recipient, &s.amount);

        Payment {
            schedule_id,
            recipient: s.recipient.clone(),
            amount: s.amount,
            paid_count: s.paid_count,
            ts: now,
        }
        .publish(&env);

        Ok(())
    }

    /// Pause an active schedule. Sender-only.
    pub fn pause(env: Env, schedule_id: u64) -> Result<(), Error> {
        let mut s = Self::load(&env, schedule_id)?;
        s.sender.require_auth();
        if s.status != Status::Active {
            return Err(Error::NotActive);
        }
        s.status = Status::Paused;
        Self::save(&env, schedule_id, &s);
        StatusChanged {
            schedule_id,
            status: Status::Paused,
        }
        .publish(&env);
        Ok(())
    }

    /// Resume a paused schedule. Sender-only.
    ///
    /// Resuming does not shift the cadence anchor: if an interval elapsed while
    /// paused, the schedule is immediately due once resumed. This is
    /// intentional — pausing withholds payments, it does not forgive them.
    pub fn resume(env: Env, schedule_id: u64) -> Result<(), Error> {
        let mut s = Self::load(&env, schedule_id)?;
        s.sender.require_auth();
        if s.status == Status::Ended {
            return Err(Error::AlreadyEnded);
        }
        if s.status != Status::Paused {
            return Err(Error::NotPaused);
        }
        s.status = Status::Active;
        Self::save(&env, schedule_id, &s);
        StatusChanged {
            schedule_id,
            status: Status::Active,
        }
        .publish(&env);
        Ok(())
    }

    /// Cancel a schedule and refund the remaining escrow to the sender.
    /// Sender-only. Idempotency: rejects if already `Ended`.
    pub fn cancel(env: Env, schedule_id: u64) -> Result<(), Error> {
        let mut s = Self::load(&env, schedule_id)?;
        s.sender.require_auth();
        if s.status == Status::Ended {
            return Err(Error::AlreadyEnded);
        }

        let refund = s.deposit;
        // Zero escrow and end the schedule before the refund transfer so a
        // re-entrant cancel sees nothing left to send.
        s.deposit = 0;
        s.status = Status::Ended;
        Self::save(&env, schedule_id, &s);

        if refund > 0 {
            let client = token::TokenClient::new(&env, &s.asset);
            client.transfer(&env.current_contract_address(), &s.sender, &refund);
        }

        Cancelled {
            schedule_id,
            refund,
        }
        .publish(&env);

        Ok(())
    }

    /// Read a schedule. Errors if the id is unknown.
    pub fn get_schedule(env: Env, schedule_id: u64) -> Result<Schedule, Error> {
        Self::load(&env, schedule_id)
    }

    // --- internal helpers --------------------------------------------------

    /// Allocate the next schedule id (starts at 1).
    fn next_id(env: &Env) -> u64 {
        let current: u64 = env
            .storage()
            .instance()
            .get(&DataKey::Counter)
            .unwrap_or(0);
        let next = current + 1;
        env.storage().instance().set(&DataKey::Counter, &next);
        next
    }

    fn load(env: &Env, id: u64) -> Result<Schedule, Error> {
        env.storage()
            .persistent()
            .get(&DataKey::Schedule(id))
            .ok_or(Error::ScheduleNotFound)
    }

    fn save(env: &Env, id: u64, s: &Schedule) {
        env.storage().persistent().set(&DataKey::Schedule(id), s);
    }
}

#[cfg(test)]
mod test;
