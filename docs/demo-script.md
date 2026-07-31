# StreamPay — Demo Video Script

## 1. Intro (Landing page on screen)
> Hi, welcome to StreamPay. StreamPay locks funds into an on-chain escrow and disburses a fixed amount on your cadence — weekly, monthly, whatever the plan says — until it ends or you cancel. Composed on Stellar, triggered by an off-chain watcher. So a business can set its payroll once, and the money streams itself out — no invoices, no chasing, no manual wires.

*[Click "Get started"]*

## 2. Connect wallet (Wallet selector modal)
> StreamPay supports multiple wallets through the Stellar Wallets Kit — you can connect with Freighter or Lobstr. I'll connect with Freighter on the Stellar testnet.
>
> *[Approve the connection. Show the wallet address and XLM balance appear in the top bar]*
>
> Once connected, your public key becomes the escrow sender, and every payment you trigger is signed right from your wallet.

## 3. Dashboard (wallet-scoped view)
> Here's the dashboard — and it's scoped to your wallet. Think of it as the payroll cockpit:
>
> - **Active streams** — the number of employees or contractors currently on a payment plan
> - **Total locked** — the funds sitting in your escrows on-chain
> - **Monthly outflow** — your normalized ~30-day payroll commitment
> - **Next disbursement** — when the soonest payment is due
>
> Your wallet balance is always visible in the top bar, and you can flip between "My streams" and "Incoming" to see what you're paying out versus what's paying you.
>
> Below that is the live activity feed — every deposit and disbursement from the contract, streamed in real time.

## 4. Create a stream (Create view)
> Let's put an employee on payroll. I'll create a new stream: recipient's Stellar address, amount per installment, cadence, total installments, and the initial deposit that funds the escrow.
>
> *[Fill: e.g. 250 XLM, weekly, 12 installments, 3,000 deposit]*
>
> Notice the live cost summary — total commitment and how many runs the deposit funds. This mirrors the exact guards the smart contract enforces. One click, sign in the wallet, and the schedule is created on-chain.
>
> *[Show success panel with tx hash and Stellar Expert link]*

## 5. Trigger the watcher (Dashboard — "Simulate watcher tick")
> Soroban contracts can't self-execute, so an off-chain watcher — a cron — calls `pay_next()` on schedule. Here I can simulate that watcher tick: it fires `pay_next()` on every due stream, and you'll see the payments land in the activity feed.

## 6. Streams + Activity (optional, for the full flow)
> The Streams view shows every schedule with its progress — paid installments, next due time, escrow remaining. The Activity feed logs the full contract lifecycle: created, payments, deposits, cancellations — all five event types, polled from Soroban every five seconds.

## 7. Architecture (for technical audiences)
> For the deeper cut: a sender locks funds into the subscription contract. `pay_next()` enforces timing, deposit sufficiency, and the installment cap before disbursing to the recipient — permissionless, so the watcher only pays gas fees. Cancel mid-plan and the remainder is refunded to the cent.

## 8. Outro
> StreamPay — set it once, let it run. Programmable recurring payments on Stellar.
