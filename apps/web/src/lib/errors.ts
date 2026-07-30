export function errorMessage(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error);
  const message = raw.toLowerCase();

  if (/reject|declin|denied|cancelled|canceled/.test(message)) {
    return 'Signature request was rejected.';
  }
  if (/freighter|lobstr|wallet|extension|locked|not connected|connect a wallet/.test(message)) {
    return 'Wallet is unavailable or locked.';
  }
  // Detect on-chain authorization failures (require_auth checks in the contract).
  // Soroban host functions surface these as "HostError: Error(Contract, #4)" or
  // "AuthError" in the simulation/preflight response.
  if (
    /authorization:|autherror|require_auth|auth.*fail|not.*author|not.*sender|hosterror.*contract.*#4/.test(message)
  ) {
    return 'Only the stream sender can perform this action.';
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
