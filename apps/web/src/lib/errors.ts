export function errorMessage(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error);
  const message = raw.toLowerCase();

  if (/reject|declin|denied|cancelled|canceled/.test(message)) {
    return 'Signature request was rejected.';
  }
  if (/freighter|lobstr|wallet|extension|locked|not connected|connect a wallet/.test(message)) {
    return 'Wallet is unavailable or locked.';
  }
  if (/insufficientdeposit|insufficient deposit|insufficient escrow|contract.*#3/.test(message)) {
    return 'Contract escrow is insufficient for this payment.';
  }
  if (/insufficient|underfunded|balance|op_underfunded/.test(message)) {
    return 'Insufficient XLM balance.';
  }
  if (/rpc|submit|simulation|network|fetch|timeout|not_found|try_again|ended failed|tx .*failed/.test(message)) {
    return 'Stellar RPC could not submit or confirm the transaction.';
  }
  return raw || 'Transaction failed.';
}
