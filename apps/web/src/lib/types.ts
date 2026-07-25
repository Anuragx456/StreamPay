// Domain types shared across the app. These mirror the Soroban contract's
// `Schedule` struct so the mock layer and the real contract layer are
// interchangeable behind lib/contract.ts.

export type ScheduleStatus = 'Active' | 'Paused' | 'Ended';

/** How often a stream disburses, expressed as a cadence in seconds. */
export interface Cadence {
  label: string; // e.g. "Weekly"
  secs: number; // e.g. 604800
}

export interface Schedule {
  id: string;
  /** Optional human label shown in the UI (not stored on-chain). */
  label: string;
  sender: string;
  recipient: string;
  /** Per-installment amount in whole asset units (stroops handled in lib). */
  amount: number;
  asset: string; // asset code or contract id, e.g. "XLM"
  cadenceSecs: number;
  totalCount: number;
  paidCount: number;
  /** Unix seconds of the last disbursement, 0 if never paid. */
  lastPaidTs: number;
  /** Remaining escrowed balance in whole asset units. */
  deposit: number;
  status: ScheduleStatus;
  /** Unix seconds the schedule was created. */
  createdTs: number;
}

export type EventType = 'created' | 'payment' | 'deposit' | 'cancel' | 'pause' | 'resume';

export interface StreamEvent {
  id: string;
  type: EventType;
  scheduleId: string;
  /** Amount involved, when relevant (payment/deposit/cancel refund). */
  amount?: number;
  asset?: string;
  txHash: string;
  ts: number;
}

/** Payload for creating a new stream from the /create form. */
export interface CreateScheduleInput {
  recipient: string;
  label: string;
  amount: number;
  asset: string;
  cadenceSecs: number;
  totalCount: number;
  initialDeposit: number;
}

export interface TransactionReceipt<T = unknown> {
  hash: string;
  value: T;
}

export type TransactionState =
  | 'idle'
  | 'awaiting_signature'
  | 'submitting'
  | 'pending'
  | 'success'
  | 'failed';

export interface TransactionFeedback {
  state: TransactionState;
  hash?: string;
  message?: string;
}

export type TransactionProgress = (state: TransactionState, hash?: string) => void;

export interface EventPage {
  events: StreamEvent[];
  cursor?: string;
}
