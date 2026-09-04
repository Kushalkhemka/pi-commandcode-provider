# CommandCode Quota Board

A local-first operations dashboard for monitoring CommandCode quotas across many API keys. Paste a key, verify the associated account, and compare 5-hour, weekly, and monthly usage across the whole fleet or one account at a time.

The board is built for teams managing roughly 5–100 CommandCode accounts. API keys stay encrypted on the server and are excluded from normal dashboard responses. An operator can explicitly copy one through a separately protected, no-cache export route.

![CommandCode Quota Board in pure-black mode](./design/implementation-desktop-dark.png)

## What you get

- Global quota health across every connected key
- Per-account 5-hour, weekly, and monthly meters with reset times
- Associated CommandCode email, plan, renewal date, and key fingerprint
- Aggregate input tokens, output tokens, requests, cost, and success rate
- Snapshot-delta charts for 24 hours, 7 days, and 30 days
- Optional model, cache-read, cache-write, and cache-hit analytics
- Concurrent bulk refreshes with per-account failure isolation
- Pure-black dark mode and a high-contrast light mode
- Responsive account table and full mobile workflow
- 50 bundled profile avatars, assigned deterministically from each key fingerprint
- Operator-confirmed API key copying without exposing keys in the dashboard payload
- In-product endpoint inventory showing each data source and its stability

## Quick start

```bash
cd quota-board
npm install
npm run dev
```

Open [http://127.0.0.1:4173](http://127.0.0.1:4173). The frontend development server proxies `/api` to the local API server on port `8787`.

Production-style local run:

```bash
npm run build
npm start
```

Then open [http://127.0.0.1:8787](http://127.0.0.1:8787).

## Where each statistic comes from

| Statistic                                    | Source                             | Available from API key alone |
| -------------------------------------------- | ---------------------------------- | ---------------------------- |
| Account email and login                      | `GET /alpha/whoami`                | Yes                          |
| Monthly balance                              | `GET /alpha/billing/credits`       | Yes                          |
| 5-hour and weekly windows                    | `GET /alpha/billing/credits`       | Yes                          |
| Plan and billing period                      | `GET /alpha/billing/subscriptions` | Yes                          |
| Requests, cost, success, input/output tokens | `GET /alpha/usage/summary`         | Yes                          |
| Current model catalog                        | `GET /provider/v1/models`          | Yes                          |
| Historical model mix                         | Board telemetry ingestion          | No                           |
| Cache read/write and cache hit rate          | Board telemetry ingestion          | No                           |

The `/alpha/*` routes are used by the current official CommandCode client but are not part of the public Provider API documentation. The board isolates parsing and surfaces endpoint stability so changes are visible. The documented generation endpoints are `/provider/v1/chat/completions` and `/provider/v1/messages`.

CommandCode's API-key quota endpoints do not currently expose historical per-request model or cache fields. The dashboard never fabricates those values. It shows `Not observed` until your provider integration sends usage events.

When using this repository's Pi provider, automatic telemetry only needs:

```bash
export COMMANDCODE_QUOTA_BOARD_URL="http://127.0.0.1:8787"
```

The provider matches accounts using a short SHA-256 key fingerprint and never sends the API key to the telemetry endpoint. Reporting is asynchronous and best-effort, so an unavailable board cannot delay or fail a Pi response.

## Optional model and cache telemetry

After a streamed or non-streamed provider request completes, forward its final usage record to the board:

```bash
curl -X POST http://127.0.0.1:8787/api/telemetry \
  -H 'content-type: application/json' \
  -d '{
    "accountId": "ACCOUNT_UUID_FROM_THE_BOARD",
    "model": "MODEL_ID",
    "inputTokens": 12000,
    "outputTokens": 820,
    "cacheReadTokens": 6400,
    "cacheWriteTokens": 300,
    "cost": 0.042,
    "status": "completed"
  }'
```

Loopback ingestion is allowed by default. For any non-loopback deployment, configure `QUOTA_BOARD_INGEST_TOKEN` and send `Authorization: Bearer <token>`.

## Key storage

The local JSON vault is stored under `data/` and ignored by Git.

- API keys use AES-256-GCM authenticated encryption.
- A random 32-byte master key is created at `data/.master-key` with mode `0600` when no key is configured.
- Set `QUOTA_BOARD_MASTER_KEY` to a 64-character hex value or base64-encoded 32-byte value to manage the key yourself.
- Normal dashboard APIs return only a short SHA-256 fingerprint, never the original key or ciphertext.
- On-demand key copying is disabled unless `QUOTA_BOARD_KEY_EXPORT_TOKEN` is configured. The export is an authenticated `POST` response marked `no-store`.
- Data writes are serialized, atomic, and owner-readable only.

See [`.env.example`](./.env.example) for all configuration options. Do not expose the server directly to the public internet without adding authentication and TLS at a trusted reverse proxy.

## Board API

| Method   | Route                       | Purpose                              |
| -------- | --------------------------- | ------------------------------------ |
| `GET`    | `/api/health`               | Liveness check                       |
| `GET`    | `/api/endpoints`            | CommandCode endpoint inventory       |
| `GET`    | `/api/dashboard?range=24h`  | Aggregated board state               |
| `POST`   | `/api/accounts/verify`      | Validate a key without storing it    |
| `POST`   | `/api/accounts`             | Encrypt and connect an account       |
| `POST`   | `/api/accounts/:id/refresh` | Refresh one account                  |
| `POST`   | `/api/accounts/:id/key`     | Copy one key after operator unlock   |
| `POST`   | `/api/refresh`              | Refresh all accounts, four at a time |
| `DELETE` | `/api/accounts/:id`         | Remove one key and its local history |
| `POST`   | `/api/telemetry`            | Ingest model and cache usage         |

## Quality checks

```bash
npm run check
```

This runs the vault and analytics tests, TypeScript validation, and the production build.

The bundled account art can be regenerated with `npm run sync:avatars`. It uses deterministic local SVG variants of [DiceBear Notionists](https://www.dicebear.com/styles/notionists/), distributed under CC0.

## Design references

The interface uses recurring patterns found in professional developer tooling: [Vercel's compact usage hierarchy](https://mobbin.com/screens/51ef7780-7659-4dae-a7fe-039d26fb20b7), [OpenAI Platform's split chart/summary layout](https://mobbin.com/screens/2bf4f941-a9a7-4308-aa0c-864135823830), [Cursor's usage ledger](https://mobbin.com/screens/50a6ea0b-6206-4f40-8dc1-b143178d1405), and [Neon's quiet resource cards](https://mobbin.com/screens/57e883a3-2c9f-42aa-b776-c873201a6cdc). The implementation remains original and tailored to multi-key quota operations.

## License

This dashboard inherits the repository's license. CommandCode is a third-party service; this project is unofficial and is not endorsed by CommandCode.
