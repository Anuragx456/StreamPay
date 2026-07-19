// Classic Stellar (Horizon) helpers for the Level 1 flow: fetch a wallet's
// native XLM balance and send a native XLM payment on testnet. These are
// independent of the Soroban subscription contract — they work whether or not
// VITE_CONTRACT_ID is set — so the wallet/balance/send experience is always
// real against the live network.

import {
  Horizon,
  TransactionBuilder,
  Operation,
  Asset,
  BASE_FEE,
  Networks,
} from '@stellar/stellar-sdk';
import { HORIZON_URL, NETWORK_PASSPHRASE } from './constants';
import { signTransactionXdr } from './walletKit';

const horizon = new Horizon.Server(HORIZON_URL, {
  allowHttp: HORIZON_URL.startsWith('http://'),
});

/** A Stellar public key is a 56-char base32 string starting with G. */
const PUBKEY_RE = /^G[A-Z2-7]{55}$/;

export function isValidPublicKey(key: string): boolean {
  return PUBKEY_RE.test(key.trim());
}

/**
 * Result of a balance fetch. `funded` is false when the account does not exist
 * yet on the network (never received the base reserve) — a common state for a
 * brand-new testnet key before the friendbot funds it.
 */
export interface BalanceResult {
  xlm: number;
  funded: boolean;
}

/**
 * Fetch the native XLM balance for a public key from Horizon. Returns
 * { xlm: 0, funded: false } for a not-yet-funded account rather than throwing,
 * so the UI can prompt the user to fund it. Re-throws real network errors.
 */
export async function fetchXlmBalance(publicKey: string): Promise<BalanceResult> {
  try {
    const account = await horizon.loadAccount(publicKey);
    const native = account.balances.find((b) => b.asset_type === 'native');
    return { xlm: native ? Number(native.balance) : 0, funded: true };
  } catch (err) {
    // Horizon returns 404 for accounts that don't exist on-chain yet.
    if (isNotFound(err)) return { xlm: 0, funded: false };
    throw err;
  }
}

/**
 * Build, sign (via the connected wallet), and submit a native XLM payment on
 * testnet. Returns the transaction hash on success. Throws with a readable
 * message on validation, signing, or submission failure.
 */
export async function sendXlmPayment(params: {
  source: string;
  destination: string;
  amount: number;
  memo?: string;
}): Promise<{ hash: string }> {
  const { source, destination, amount } = params;

  if (!isValidPublicKey(source)) throw new Error('Connect a wallet first.');
  if (!isValidPublicKey(destination)) throw new Error('Recipient is not a valid Stellar public key.');
  if (!(amount > 0)) throw new Error('Amount must be greater than 0.');

  const account = await horizon.loadAccount(source);

  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE || Networks.TESTNET,
  })
    .addOperation(
      Operation.payment({
        destination,
        asset: Asset.native(),
        // Horizon expects a string amount in whole XLM (7-decimal precision).
        amount: amount.toFixed(7),
      }),
    )
    .setTimeout(60)
    .build();

  const signedXdr = await signTransactionXdr(tx.toXDR());
  const signedTx = TransactionBuilder.fromXDR(signedXdr, NETWORK_PASSPHRASE || Networks.TESTNET);

  const res = await horizon.submitTransaction(signedTx);
  return { hash: res.hash };
}

/**
 * Fund a testnet account via Friendbot (adds the base reserve + 10,000 XLM).
 * No-op-safe: throws a readable error on non-testnet or if the account is
 * already funded. Only meaningful on testnet.
 */
export async function fundWithFriendbot(publicKey: string): Promise<void> {
  if (!isValidPublicKey(publicKey)) throw new Error('Connect a wallet first.');
  const res = await fetch(`https://friendbot.stellar.org/?addr=${encodeURIComponent(publicKey)}`);
  if (!res.ok) {
    // Friendbot returns 400 if the account already exists.
    const body = await res.text().catch(() => '');
    if (res.status === 400 && body.includes('op_already_exists')) return;
    throw new Error(`Friendbot funding failed (${res.status}). The account may already be funded.`);
  }
}

/** URL of a network explorer entry for a transaction hash. */
export function explorerTxUrl(hash: string): string {
  const net = NETWORK_PASSPHRASE === Networks.PUBLIC ? 'public' : 'testnet';
  return `https://stellar.expert/explorer/${net}/tx/${hash}`;
}

/** Best-effort detection of a Horizon 404 (account not found). */
function isNotFound(err: unknown): boolean {
  const e = err as { response?: { status?: number }; status?: number };
  return e?.response?.status === 404 || e?.status === 404;
}
