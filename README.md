# StreamPay

A Soroban (Stellar) based **recurring payment / subscription stream** service.

A sender locks funds into an escrow contract. The contract disburses a fixed amount to a
recipient on a cadence (weekly / monthly / …) until an installment count is reached or the
sender cancels. Because Soroban contracts cannot self-execute, an off-chain **watcher**
triggers `pay_next()` on schedule.

```
Sender ──deposit──▶ [ Subscription Contract (escrow) ] ──pay_next()──▶ Recipient
                              ▲
                              │ cron trigger
                        [ Off-chain Watcher ]
```

## Monorepo layout

```
streampay/
├── apps/
│   ├── web/          # Vite + React 18 + TS + Tailwind frontend (wallet kit, zustand)
│   └── watcher/      # Node + TS cron that submits pay_next() txs
├── contracts/
│   └── subscription/ # Soroban Rust contract + tests
├── .github/workflows/ci.yml
└── package.json      # npm workspaces
```

## Quick start (MOCK MODE — no chain needed)

```bash
npm install
npm run dev          # boots apps/web at http://localhost:5173
```

With no `VITE_CONTRACT_ID` set, the UI runs fully in-memory so every view is demoable.

Full setup, testnet deploy (friendbot + `soroban contract deploy`), watcher, and testing
instructions are in the sections added during later build steps (see bottom of this file).

## Workspace scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the web app (Vite dev server) |
| `npm run build` | Production build of the web app |
| `npm test` | Run frontend unit tests (Vitest) |
| `npm run watcher` | Start the watcher loop |
| `npm run watcher:once` | Trigger one watcher pass and exit (`--once`) |
| `npm run contract:build` | `soroban contract build` |
| `npm run contract:test` | `cargo test` for the contract |
| `npm run format` | Prettier across the workspaces |

## License

MIT
