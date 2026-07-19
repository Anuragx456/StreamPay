//! Unit tests for the StreamPay subscription contract.
//!
//! Run with `cargo test` from `contracts/subscription/` (there is no
//! `stellar test` / `soroban test` subcommand — the CLI was renamed to
//! `stellar` and contract tests are ordinary Rust tests using the SDK's
//! `testutils` feature).
//!
//! Coverage:
//! - `init` stores the schedule with expected defaults
//! - `deposit` pulls funds into escrow
//! - `pay_next` timing guard (rejected before due, accepted after)
//! - full payout transitions the schedule to `Ended`
//! - `cancel` refunds the remaining escrow to the sender
//! - unauthorized access is rejected (auth is scoped to the *stored* sender)

#![cfg(test)]

use super::*;
use soroban_sdk::{
    testutils::{Address as _, Ledger, MockAuth, MockAuthInvoke},
    token, Address, Env, IntoVal,
};

/// Test rig: an env with a deployed subscription contract, a Stellar Asset
/// Contract to stream, and funded sender/recipient addresses.
struct Setup<'a> {
    env: Env,
    contract: SubscriptionContractClient<'a>,
    asset: Address,
    token: token::TokenClient<'a>,
    sender: Address,
    recipient: Address,
}

/// Whole-token amounts scaled to 7 decimals (the SAC default), matching how a
/// real XLM/USDC stream would be denominated.
const UNIT: i128 = 10_000_000;

fn setup<'a>() -> Setup<'a> {
    let env = Env::default();

    let sender = Address::generate(&env);
    let recipient = Address::generate(&env);

    // Deploy a Stellar Asset Contract; `sender` is its admin so we can mint.
    let sac = env.register_stellar_asset_contract_v2(sender.clone());
    let asset = sac.address();
    let token = token::TokenClient::new(&env, &asset);
    let token_admin = token::StellarAssetClient::new(&env, &asset);

    // Fund the sender. Minting is admin-authorized; mock auth just for setup.
    env.mock_all_auths();
    token_admin.mint(&sender, &(1_000 * UNIT));

    let contract_id = env.register(SubscriptionContract, ());
    let contract = SubscriptionContractClient::new(&env, &contract_id);

    Setup {
        env,
        contract,
        asset,
        token,
        sender,
        recipient,
    }
}

/// A weekly stream of 10 tokens x 4 installments, created + funded with the
/// given escrow. Auth is mocked (caller is the stored sender).
fn create_funded(s: &Setup, installments: u32, escrow_units: i128) -> u64 {
    s.env.mock_all_auths();
    let id = s.contract.init_schedule(
        &s.sender,
        &s.recipient,
        &(10 * UNIT),
        &s.asset,
        &(7 * 86_400), // weekly
        &installments,
    );
    if escrow_units > 0 {
        s.contract.deposit(&id, &(escrow_units * UNIT));
    }
    id
}

#[test]
fn init_stores_schedule_with_defaults() {
    let s = setup();
    let id = create_funded(&s, 4, 0);
    assert_eq!(id, 1, "ids start at 1");

    let sched = s.contract.get_schedule(&id);
    assert_eq!(sched.sender, s.sender);
    assert_eq!(sched.recipient, s.recipient);
    assert_eq!(sched.amount, 10 * UNIT);
    assert_eq!(sched.total_count, 4);
    assert_eq!(sched.paid_count, 0);
    assert_eq!(sched.last_paid_ts, 0);
    assert_eq!(sched.deposit, 0);
    assert_eq!(sched.status, Status::Active);
}

#[test]
fn init_rejects_bad_arguments() {
    let s = setup();
    s.env.mock_all_auths();

    // amount <= 0
    let bad_amount =
        s.contract
            .try_init_schedule(&s.sender, &s.recipient, &0, &s.asset, &86_400, &4);
    assert_eq!(bad_amount, Err(Ok(Error::InvalidArgument)));

    // total_count == 0
    let bad_count = s.contract.try_init_schedule(
        &s.sender,
        &s.recipient,
        &(10 * UNIT),
        &s.asset,
        &86_400,
        &0,
    );
    assert_eq!(bad_count, Err(Ok(Error::InvalidArgument)));
}

#[test]
fn deposit_moves_funds_into_escrow() {
    let s = setup();
    let id = create_funded(&s, 4, 0);

    let before = s.token.balance(&s.sender);
    s.env.mock_all_auths();
    s.contract.deposit(&id, &(40 * UNIT));

    assert_eq!(s.contract.get_schedule(&id).deposit, 40 * UNIT);
    // Funds actually left the sender and sit in the contract.
    assert_eq!(s.token.balance(&s.sender), before - 40 * UNIT);
    assert_eq!(s.token.balance(&s.contract.address), 40 * UNIT);
}

#[test]
fn pay_next_timing_guard() {
    let s = setup();
    let id = create_funded(&s, 4, 40); // fully funded weekly stream

    // Anchor is created_ts; nothing is due immediately.
    let early = s.contract.try_pay_next(&id);
    assert_eq!(
        early,
        Err(Ok(Error::NotYetDue)),
        "payment before one cadence has elapsed must be rejected"
    );

    // Advance to exactly one cadence later: now due.
    let created = s.contract.get_schedule(&id).created_ts;
    s.env.ledger().set_timestamp(created + 7 * 86_400);

    // pay_next needs no auth (watcher/recipient can call it).
    s.contract.pay_next(&id);
    let sched = s.contract.get_schedule(&id);
    assert_eq!(sched.paid_count, 1);
    assert_eq!(sched.deposit, 30 * UNIT);
    assert_eq!(s.token.balance(&s.recipient), 10 * UNIT);

    // Immediately calling again is rejected — the timestamp guard advanced.
    let repeat = s.contract.try_pay_next(&id);
    assert_eq!(
        repeat,
        Err(Ok(Error::NotYetDue)),
        "a second payment within the same interval is a double-withdrawal and must fail"
    );
}

#[test]
fn insufficient_deposit_is_rejected_even_when_due() {
    let s = setup();
    let id = create_funded(&s, 4, 0); // no escrow

    let created = s.contract.get_schedule(&id).created_ts;
    s.env.ledger().set_timestamp(created + 7 * 86_400);

    let res = s.contract.try_pay_next(&id);
    assert_eq!(res, Err(Ok(Error::InsufficientDeposit)));
}

#[test]
fn full_payout_ends_schedule() {
    let s = setup();
    let id = create_funded(&s, 3, 30); // 3 installments, exactly funded

    let mut when = s.contract.get_schedule(&id).created_ts;
    for expected in 1..=3u32 {
        when += 7 * 86_400;
        s.env.ledger().set_timestamp(when);
        s.contract.pay_next(&id);
        assert_eq!(s.contract.get_schedule(&id).paid_count, expected);
    }

    let sched = s.contract.get_schedule(&id);
    assert_eq!(sched.status, Status::Ended, "final installment ends it");
    assert_eq!(sched.deposit, 0);
    assert_eq!(s.token.balance(&s.recipient), 30 * UNIT);

    // Further payments on an Ended schedule are rejected.
    when += 7 * 86_400;
    s.env.ledger().set_timestamp(when);
    assert_eq!(s.contract.try_pay_next(&id), Err(Ok(Error::NotActive)));
}

#[test]
fn cancel_refunds_remaining_escrow() {
    let s = setup();
    let id = create_funded(&s, 4, 40);

    // Pay one installment, leaving 30 in escrow.
    let created = s.contract.get_schedule(&id).created_ts;
    s.env.ledger().set_timestamp(created + 7 * 86_400);
    s.contract.pay_next(&id);
    assert_eq!(s.contract.get_schedule(&id).deposit, 30 * UNIT);

    let sender_before = s.token.balance(&s.sender);
    s.env.mock_all_auths();
    s.contract.cancel(&id);

    let sched = s.contract.get_schedule(&id);
    assert_eq!(sched.status, Status::Ended);
    assert_eq!(sched.deposit, 0);
    // The 30-unit remainder went back to the sender.
    assert_eq!(s.token.balance(&s.sender), sender_before + 30 * UNIT);
    assert_eq!(s.token.balance(&s.contract.address), 0);
}

#[test]
fn pause_blocks_payment_then_resume_allows_it() {
    let s = setup();
    let id = create_funded(&s, 4, 40);

    s.env.mock_all_auths();
    s.contract.pause(&id);
    assert_eq!(s.contract.get_schedule(&id).status, Status::Paused);

    // Even when due, a paused stream rejects payment.
    let created = s.contract.get_schedule(&id).created_ts;
    s.env.ledger().set_timestamp(created + 7 * 86_400);
    assert_eq!(s.contract.try_pay_next(&id), Err(Ok(Error::NotActive)));

    // Resume, then it pays (the elapsed interval is not forgiven).
    s.env.mock_all_auths();
    s.contract.resume(&id);
    s.contract.pay_next(&id);
    assert_eq!(s.contract.get_schedule(&id).paid_count, 1);
}

/// The core security property: auth is bound to the *stored* sender, not the
/// caller. An attacker who is not the sender cannot pause/cancel/deposit even
/// though they can name the schedule id.
#[test]
fn unauthorized_access_is_rejected() {
    let s = setup();
    let id = create_funded(&s, 4, 40);

    let attacker = Address::generate(&s.env);
    assert_ne!(attacker, s.sender, "attacker must be a distinct identity");

    // Authorize ONLY the attacker, for ANY call they might make. This is the
    // adversarial case: the attacker HAS valid authorization — just their own,
    // not the sender's. Because every sender-guarded fn calls `require_auth` on
    // the *stored* sender, the attacker's auth must not satisfy it.
    //
    // `mock_auths` grants auth solely to the listed address+invocation; any
    // `require_auth` for an address not covered here fails. `try_*` surfaces
    // that failure as an `Err` instead of panicking the test. We arm the
    // attacker's auth scoped to the exact fn/args they're attempting, so the
    // only reason each call fails is that `require_auth` targets the *sender*,
    // not the caller — not an incidental scope mismatch.
    let arm = |fn_name: &'static str, args: soroban_sdk::Vec<soroban_sdk::Val>| {
        s.env.mock_auths(&[MockAuth {
            address: &attacker,
            invoke: &MockAuthInvoke {
                contract: &s.contract.address,
                fn_name,
                args,
                sub_invokes: &[],
            },
        }]);
    };

    arm("cancel", (id,).into_val(&s.env));
    assert!(
        s.contract.try_cancel(&id).is_err(),
        "cancel with only the attacker's auth must be rejected"
    );

    arm("pause", (id,).into_val(&s.env));
    assert!(
        s.contract.try_pause(&id).is_err(),
        "pause with only the attacker's auth must be rejected"
    );

    arm("deposit", (id, UNIT).into_val(&s.env));
    assert!(
        s.contract.try_deposit(&id, &UNIT).is_err(),
        "deposit with only the attacker's auth must be rejected"
    );

    // State is untouched by every rejected call.
    let sched = s.contract.get_schedule(&id);
    assert_eq!(sched.status, Status::Active);
    assert_eq!(sched.deposit, 40 * UNIT);
}

/// `pay_next` deliberately needs no auth, so the watcher can drive it. Verify
/// it succeeds with auth fully disabled once the payment is genuinely due.
#[test]
fn pay_next_requires_no_auth() {
    let s = setup();
    let id = create_funded(&s, 4, 40);

    let created = s.contract.get_schedule(&id).created_ts;
    s.env.ledger().set_timestamp(created + 7 * 86_400);

    // No mock_all_auths here: a bare call from an unauthenticated watcher.
    s.env.set_auths(&[]);
    s.contract.pay_next(&id);
    assert_eq!(s.contract.get_schedule(&id).paid_count, 1);
}
