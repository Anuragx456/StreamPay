# StreamPay

A Soroban (Stellar) based **recurring payment / subscription stream** service.

A sender locks funds into an on-chain escrow contract. The contract disburses a fixed
amount to a recipient on a cadence (weekly / monthly / …) until an installment count is
reached or the sender cancels. Because Soroban contracts cannot self-execute, an off-chain
**watcher** triggers `pay_next()` on schedule.

```
Sender ──deposit──▶ [ Subscription Contract (escrow) ] ──pay_next()──▶ Recipient
                              ▲
                              │ cron trigger
                        [ Off-chain Watcher ]
```

The frontend runs fully standalone in **MOCK MODE** (in-memory, no chain needed), so every
subscription view is demoable out of the box. Set a deployed contract id to switch those views
to a live testnet/mainnet contract.

The **wallet, balance, and XLM send flow is always live against Stellar Testnet** — it does not
depend on a deployed contract and satisfies the Stellar **Level 1 (White Belt)** requirements
described below.

## Level 1 — White Belt

Level 1 covers the core fundamentals of Stellar development: connecting a wallet, reading a
balance, and sending a transaction on testnet. StreamPay implements all of it as a real,
on-chain flow (no mock) via Horizon and `@creit.tech/stellar-wallets-kit`:

| Requirement | Where it lives |
| --- | --- |
| **Wallet setup** — Freighter on Stellar Testnet | `lib/walletKit.ts` builds the kit with `WalletNetwork.TESTNET` and the Freighter (+ Lobstr) modules. |
| **Connect** | Top-bar **Connect wallet** button → kit selector modal → `store/wallet.ts:connect()`. The session is persisted and restored on reload. |
| **Disconnect** | Top-bar **Disconnect** button → `store/wallet.ts:disconnect()` (tears down the kit session and clears local state). |
| **Fetch balance** | `lib/stellar.ts:fetchXlmBalance()` loads the account from Horizon and reads the native balance. |
| **Display balance** | Shown in the top bar next to the address, and on the **Send** view. Unfunded testnet accounts show an inline **Fund with Friendbot** action. |
| **Send an XLM transaction** | **Send** view (`views/Send.tsx`) → `lib/stellar.ts:sendXlmPayment()` builds a native payment, signs it with the connected wallet, and submits via Horizon. |
| **Transaction feedback** | On success the Send view shows amount, recipient, the **transaction hash**, and a **stellar.expert explorer link**; failures show the error. Toasts mirror both outcomes. |

### Try the Level 1 flow

```bash
npm install
npm run dev            # http://localhost:5173
```

1. Install the [Freighter](https://www.freighter.app/) browser extension and switch it to **Testnet**.
2. Click **Connect wallet** in the top bar and approve the connection in Freighter.
3. Your address and XLM balance appear in the top bar. If the account is new, open **Send** and click **Fund with Friendbot** to receive testnet XLM.
4. Go to **Send**, paste any testnet recipient `G…` key, enter an amount, and click **Send payment**.
5. Approve the signature in Freighter. On success you'll see the transaction hash and an explorer link.

> The Send flow works with no `VITE_CONTRACT_ID` set — it talks to Horizon directly, so Level 1
> is fully functional in the default configuration.

### Screenshots

_Add screenshots here for submission (drop the images in `apps/web/docs/` or attach in the PR):_

- **Wallet connected** — top bar showing the truncated address and wallet name.
- **Balance displayed** — top bar / Send view showing the XLM balance.
- **Successful testnet transaction** — the Send view result panel with the transaction hash.
- **Transaction result shown to the user** — the explorer link / success toast.

## Features

### Smart contract (`contracts/subscription`)
- **Escrow-backed schedules** — each `Schedule` stores sender, recipient, per-installment
  `amount`, streamed `asset`, `cadence_secs`, `total_count`, `paid_count`, `last_paid_ts`,
  remaining `deposit`, and lifecycle `status`.
- **`init_schedule`** — create a schedule (requires sender auth; rejects non-positive amount,
  zero count, or zero cadence). Escrow starts at 0 and is funded separately.
- **`deposit`** — top up a schedule's escrow, pulling the asset from the sender via the token
  contract (`token::TokenClient::transfer`).
- **`pay_next`** — disburse the next installment. Callable by anyone (watcher or recipient)
  because it can only move funds along the sender's committed terms, guarded by: status is
  `Active`, `paid_count < total_count`, `deposit >= amount`, and `now >= anchor + cadence_secs`.
  Ends the schedule automatically on the final installment.
- **`pause` / `resume`** — sender-only halt and continue. Pausing withholds payments without
  shifting the cadence anchor, so a schedule is immediately due when resumed if an interval
  elapsed.
- **`cancel`** — sender-only termination that refunds the remaining escrow.
- **Security model** — every sender-acting call uses `Address::require_auth` on the *stored*
  sender; double-withdrawal is blocked by an independent timestamp guard and installment
  counter; effects are applied before token transfers to defeat re-entrancy; `i128` balances
  with `overflow-checks` on in release.
- **Typed events** — `created`, `payment`, `deposit`, `cancel`, and `status` events are
  published with stable topics for indexers, the watcher, and the activity feed.
- **Stable error codes** — `ScheduleNotFound`, `NotYetDue`, `InsufficientDeposit`,
  `AlreadyComplete`, `NotActive`, `AlreadyEnded`, `InvalidArgument`, `NotPaused`.

### Web app (`apps/web`)
- **Landing page** — standalone marketing surface with hero, integration logos, "how it
  works", a browser-mockup dashboard preview, and a testimonial marquee.
- **Dashboard** — KPI cards (active streams, total locked, normalized monthly outflow, next
  disbursement), a live event marquee, active-stream cards, and a recent-activity list. A
  **Simulate watcher tick** button walks every due stream and calls `pay_next()` — the same
  call the off-chain watcher makes.
- **Streams** — full list of schedules with status filtering (All / Active / Paused / Ended)
  and per-stream actions (deposit, pay next, pause/resume, cancel).
- **Create** — form with client-side validation mirroring the contract guards, cadence
  presets (minute → quarterly), asset selection, and a live cost summary. Requires a connected
  wallet, whose key becomes the escrow sender.
- **Send** — the Level 1 flow: send a native XLM payment on testnet via Horizon, signed by the
  connected wallet, with a Friendbot funding shortcut and a result panel showing the
  transaction hash and explorer link. Independent of the subscription contract.
- **Activity** — full event log, newest first, filterable by event type.
- **Architecture** — an in-app diagram of the sender → escrow → recipient flow, the watcher's
  role, and the current mock/live mode.
- **Wallet connect** — `@creit.tech/stellar-wallets-kit` integration (Freighter / Lobstr) on
  Stellar Testnet for signing transactions. Connecting fetches and displays the account's live
  XLM balance from Horizon; the session is persisted and restored on reload.
- **Light / dark / system theming** with a persisted toggle.
- **Mock ↔ live seam** — `lib/contract.ts` picks the in-memory `mockClient` or the real
  `sorobanClient` at runtime based on `VITE_CONTRACT_ID`; views are identical across modes.
- **Design-system guard** — a build/lint step (`scripts/check-banned.mjs`) fails if banned
  design patterns are reintroduced; screenshot tooling in `scripts/shots.mjs`.

### Off-chain watcher (`apps/watcher`)
- Node + TypeScript cron intended to poll due schedules and submit signed `pay_next()`
  transactions from a funded account. Runs as a loop or a single `--once` pass.

> Note: the watcher package is scaffolded (config + scripts) and its transaction-submitting
> source is not yet implemented in this repo.

## Monorepo layout

```
streampay/
├── apps/
│   ├── web/          # Vite + React 18 + TS + Tailwind frontend (wallet kit, zustand)
│   └── watcher/      # Node + TS cron that submits pay_next() txs
├── contracts/
│   └── subscription/ # Soroban Rust contract + tests
├── .github/workflows/ci.yml
├── .env.example
└── package.json      # npm workspaces
```

## Tech stack

- **Contract**: Rust, `soroban-sdk`, `no_std`
- **Frontend**: Vite, React 18, TypeScript, Tailwind CSS, Zustand, React Router,
  `@stellar/stellar-sdk`, `@creit.tech/stellar-wallets-kit`
- **Watcher**: Node ≥ 20, TypeScript (`tsx`), `@stellar/stellar-sdk`, `dotenv`
- **Tooling**: Vitest, ESLint, Prettier, Playwright (screenshots), GitHub Actions CI

## Quick start (MOCK MODE — no chain needed)

```bash
npm install
npm run dev          # boots apps/web at http://localhost:5173
```

With no `VITE_CONTRACT_ID` set, the UI runs fully in-memory so every view is demoable.

## Configuration

Copy `.env.example` to `.env` and fill in the values.

Frontend (`apps/web`, `VITE_`-prefixed, read at build time):

| Variable | Purpose |
| --- | --- |
| `VITE_CONTRACT_ID` | Deployed contract id (56-char `C…`). **Leave empty for MOCK MODE**; any value switches the *subscription* views to live. Does **not** affect the Level 1 wallet/balance/send flow, which is always live. |
| `VITE_NETWORK_PASSPHRASE` | Network passphrase (testnet by default). |
| `VITE_SOROBAN_RPC_URL` | Soroban RPC endpoint (subscription contract calls). |
| `VITE_HORIZON_URL` | Horizon endpoint for classic ops — XLM balance lookups and native payments (Level 1 flow). |
| `VITE_NETWORK` | Wallet-kit network label (`TESTNET` / `PUBLIC`). |

Watcher (`apps/watcher`):

| Variable | Purpose |
| --- | --- |
| `WATCHER_SECRET` | Secret key (`S…`) of a funded account that pays fees and submits `pay_next()`. |
| `CONTRACT_ID` | Same deployed contract id. |
| `SOROBAN_RPC_URL` | Soroban RPC endpoint. |
| `NETWORK_PASSPHRASE` | Network passphrase. |
| `POLL_INTERVAL_SECS` | Watcher poll interval (default 30). |
| `WATCH_SCHEDULE_IDS` | Comma-separated schedule ids to watch. |

## Workspace scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the web app (Vite dev server) |
| `npm run build` | Production build of the web app (design guard → `tsc` → `vite build`) |
| `npm test` | Run frontend unit tests (Vitest) |
| `npm run watcher` | Start the watcher loop |
| `npm run watcher:once` | Trigger one watcher pass and exit (`--once`) |
| `npm run contract:build` | `soroban contract build` |
| `npm run contract:test` | `cargo test` for the contract |
| `npm run lint` | Lint the workspaces (includes the design-system guard) |
| `npm run format` | Prettier across the workspaces |

## Going live (testnet)

1. Build and deploy the contract:
   ```bash
   npm run contract:build
   cd contracts/subscription && soroban contract deploy   # returns a C… contract id
   ```
2. Put the returned id in `.env` as `VITE_CONTRACT_ID` (and `CONTRACT_ID` for the watcher).
3. Restart `npm run dev` — the UI now signs mutating calls with the connected wallet and
   reads schedules over RPC.
4. Run the watcher against the same contract to disburse due installments automatically.

## Testing

- **Frontend**: Vitest unit tests (e.g. `lib/mockClient.test.ts`) — `npm test`.
- **Contract**: Rust tests in `contracts/subscription/src/test.rs` — `npm run contract:test`.
- **CI**: `.github/workflows/ci.yml` runs the design guard, lint, build, and tests on push
  and pull requests to `main`.

## License

MIT
