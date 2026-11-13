# CRAFT

Creators' Records, Assurance, Funds & Trust.

A PayPal-centred workspace for Kenyan creatives: get paid, prove the work, survive a PayPal limitation, and plan the money.

Built for the PayPal AI Hackathon.

## Live demo (Fly.io)

**App:** [https://craft-studio-ke.fly.dev](https://craft-studio-ke.fly.dev)  
**Health:** [https://craft-studio-ke.fly.dev/api/health](https://craft-studio-ke.fly.dev/api/health)  
**PayPal webhook URL:** `https://craft-studio-ke.fly.dev/api/paypal/webhook`

| Field | Value |
| --- | --- |
| Email | `judge@craft.demo` |
| Password | `CraftJudge2026!` |

Public trust page after seed: [https://craft-studio-ke.fly.dev/t/amina-studio](https://craft-studio-ke.fly.dev/t/amina-studio).

Redeploy web: `fly deploy -c fly.toml -a craft-studio-ke`  
Postgres (pgvector) is `craft-studio-ke-db` (`fly.db.toml`). Vault files live on Fly volume `craft_vault`.

## Judge quick start (local)

```bash
cp .env.example .env.local
# set AUTH_SECRET to any long random string; keep APP_URL=http://localhost:3000
docker compose up -d
npm install
npm run db:migrate
npm run db:seed
npm run dev
```

Open [http://localhost:3000/login](http://localhost:3000/login) with the same judge credentials above.

Offline checks (no API keys required):

```bash
npm test
npm run eval:suite
```

## Brand

Dusk (dark glass) is the default studio. **White mode** is a paper-and-gold light theme — same glass, same type, remembered in the browser. Toggle it from the sun/moon control on the landing page, login, and the app rail.

The landing map (`#map`) is the second section: a 3×2 pictured board of rooms (studio → bill → vault → client page, with a pink stuck-money fork). Rooms sit in a CSS grid so the board cannot collapse. A scrolling craft-name marquee sits above and below the map as the section border.

Login and signup are a split studio door: a Nairobi photographer at work on one side, the form on the other.

## What works now

- Next.js App Router (TypeScript strict), Tailwind, shadcn/ui primitives, AG Grid Community
- Auth.js email + password login; `(app)` routes are protected
- Drizzle schema for every table in `CRAFT_BUILD_PLAN.md` §4
- `GET /api/health`
- **PayPal sandbox round trip:** create a project, send an invoice, webhook marks it `funded`
- **Evidence Vault:** private upload, SHA-256, server timestamp, signed download, checklist score (in code), optional LLM reader/auditor
- **Freeze Shield (Phase 3):** paste a PayPal limitation notice → map to vault → draft letter → fail-closed verifier → approve → PDF pack
- **Delivery + trust (Phase 4):** mark a project delivered, AI match-check vs the brief, client confirm at `/c/[token]`, public trust page at `/t/[slug]`
- **Onboarding (Phase 5):** four-beat setup (You → Prove → Stage → Go) with verified link ownership (GitHub / YouTube / RSS / export), optional AI profile draft, split rules, visibility
- **Money (Phase 6):** score, cash-flow band, planner + educational investing range, split proposals on payment (approve/reject), live `/money` UI
- **Layer 1 (work security):** studio profile home, Work Proof Tokens (hash certificates), scan-to-verify QR on `/t/[slug]`, client verify card before billing
- **Rehema (studio guide):** Kabla-style bottom-right helper that explains each room once per session, then collapses to “Ask Rehema”
- **Seed + eval (Phase 7):** demo creative, labelled eval suite, judge login

## Setup

1. Copy env and generate a secret:

   ```bash
   cp .env.example .env.local
   node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
   ```

   Put the printed value in `AUTH_SECRET`. Keep `APP_URL=http://localhost:3000`.

2. Start Postgres (pgvector image on host port **5433**, so it does not collide with another local Postgres on 5432):

   ```bash
   docker compose up -d
   ```

3. Install, migrate, optionally seed, run:

   ```bash
   npm install
   npm run db:migrate
   npm run db:seed   # optional — loads the judge demo creative
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000). Sign up, or use the judge login above.

## Evidence Vault (Phase 2)

Open `/vault` after you have a project. Files land in `.data/vault` locally (gitignored) with an HMAC-signed download that expires in 15 minutes. Completeness is `present types / 6`, computed in `lib/evidence/completeness.ts` — the LLM never calculates it.

Set `LLM_API_KEY` (and optional `LLM_MODEL`, `LLM_BASE_URL`) to enable vision/JSON extraction and embeddings into `doc_chunks`. Without a key, uploads still hash and store; the auditor lists missing checklist types in plain language.

The AI only reads uploaded bytes. It cannot create evidence rows.

Phase 2 Kenya AI layer (F1–F7), each with a mocked-model test and a deterministic fallback when the LLM is off:

| Feature | What |
| --- | --- |
| F1 Document reader | Extract fields → user confirms before readiness uses them |
| F2 Notice understanding | LLM parse with heuristic fallback |
| F3 Pack reviewer | Second-pass gaps that must cite missing requests |
| F4 Reply assistant | Follow-up draft → same verifier + approve gate |
| F5 Readiness coach | Plan from failed checks only (dashboard) |
| F6 Copilot | Vault/rules Q&A with citations; “I don't know” if empty |
| F7 Flag explainer | One sentence per pre-invoice flag (cannot add/remove flags) |

## Freeze Shield (Phase 3)

Open `/freeze-shield` when PayPal limits an account. Paste the notice (a sample lives at `data/eval/paypal-limitation-notice.txt`). CRAFT:

1. Parses the ask (heuristic without an LLM key; LLM may refine)
2. Maps each request onto vault files by type, keywords, and optional pgvector neighbours
3. Runs a pack reviewer (F3) listing still-missing asks with citations
4. Drafts a cover letter that cites only uploaded filenames and SHA-256 hashes
5. Runs the fail-closed verifier (`lib/ai/claim-check.ts` + `lib/ai/verifier.ts`) — fabricated files/hashes block export
6. Requires human approval, then builds a PDF + ZIP pack into the private vault
7. Optional follow-up reply (F4) uses the same verifier and approve gate

Identity and funds documents map when uploaded under Vault → Identity; money is never calculated in this flow.

```bash
npm run eval:freeze
```

## Delivery, confirm, trust (Phase 4)

On a funded project, open the detail page and upload the final file. CRAFT:

1. Hashes the file into the Evidence Vault as type `deliverable` with a server timestamp
2. Stores optional publish links (public URLs only)
3. Runs an AI/heuristic match of the file text against the project scope and shows mismatches
4. Creates a one-click confirm link at `/c/[token]` — no login; stamps `client_confirmed_at`
5. Lets you choose visibility under **Settings** for `/t/[slug]` (counts, portfolio, quote button)

Private vault files are never exposed on confirm or trust pages. Portfolio links and publish URLs are the only outbound file references.

## Layer 1 — profile + scan-to-verify

1. **Stabilize profile** on `/dashboard` — verified link ownership + Work Proof Tokens (SHA-256 certificates, not tradeable NFTs)
2. **Client verifies** by scanning the QR or opening `/t/[slug]`

## Layer 2 — secure the job (bill → proof → confirm)

1. **Bill** from `/projects` (verify card sits above Send invoice)
2. PayPal webhook → project `funded` + split proposals
3. **Vault** evidence (hashes + timestamps; AI never invents files)
4. **Deliver** → Work Proof Token from SHA-256 → share `/c/[token]`
5. Client confirms → trust page updates
6. Side paths: **Freeze Shield** if limited; **Money** for score / splits / plan

Wording stays **verified link ownership** / **work provenance** — never verified identity.

## Onboarding + verified link ownership (Phase 5)

Open `/onboarding` (new signups land here). Three short beats — each skippable:

1. **You** — studio name, craft, country (address optional / collapsed)
2. **Prove** — add a public link → place the `CRAFT-…` challenge code → verify link ownership → optional AI draft from verified links only
3. **Run** — PayPal sandbox marker, split rules (tax / savings / expenses = 100%, computed in code), trust-page visibility → open the studio

Official sources only: GitHub API, YouTube Data API, RSS/oEmbed, plus an upload-export fallback. We say **verified link ownership**, never verified identity.

```bash
npm run eval:ownership
```

Optional env: `GITHUB_TOKEN`, `YOUTUBE_API_KEY`.

## Money (Phase 6)

Schema migration `drizzle/0003_phase6_money_inputs.sql` is additive only. Deterministic modules (LLM explains only; never calculates money):

| Module | Role |
| --- | --- |
| `lib/scoring/stability.ts` + `map-inputs.ts` | **Income stability and trust score** (never “credit score”); locked `clientKey` |
| `lib/ledger/split.ts` + `service.ts` | Split proposals; approve/reject; hooked from PayPal `fundProject` |
| `lib/forecast/timing.ts` | Days-to-pay windows (default **14 / 30 / 45**) |
| `lib/forecast/cashflow.ts` | 3-month LOW–HIGH cash-flow band |
| `lib/planner/rules.ts` | Buffer → debt → invest plan + safe-to-invest |
| `lib/planner/simulate.ts` | Educational investing **range** (not a promised return) |
| `lib/money/build-view.ts` + `service.ts` | Compose the Money view; `/money` UI |

Open `/money` after seed to see score, forecast, plan, splits, and the investing range. Open `/copilot` for vault-grounded Q&A (citations only; never invents proof or calculates money).

```bash
npm test
```

## Demo seed + evaluation (Phase 7)

`npm run db:seed` loads `data/seed/demo-creative.json`:

- Judge user **Amina Otieno** (`judge@craft.demo`)
- 5 projects with intentional evidence gaps
- Payments, one client-confirmed deliverable, split rules, planner inputs
- Synthetic `client_payment_history` rows with `is_synthetic=true`
- A pasted PayPal limitation notice ready for Freeze Shield

`npm run eval:suite` runs 18 labelled cases in `data/eval/suite.json` (notice parse, completeness, verifier, ownership) and prints accuracy. The fabricated-claim case must be blocked.

## PayPal sandbox (Phase 1)

Set these in `.env.local`:

```text
PAYPAL_ENV=sandbox
PAYPAL_CLIENT_ID=
PAYPAL_CLIENT_SECRET=
PAYPAL_WEBHOOK_ID=
```

Webhook URL to register on the sandbox app:

`https://<public-host>/api/paypal/webhook`

Subscribe to:

- `INVOICING.INVOICE.PAID` — primary; `resource.id` is the PayPal invoice id (`INV2-…`)
- `PAYMENT.CAPTURE.COMPLETED` — also handled; duplicate deliveries do not create a second payment

Endpoints used (confirmed against PayPal docs, 9 Nov 2026):

| Action | Path |
| --- | --- |
| OAuth token | `POST https://api-m.sandbox.paypal.com/v1/oauth2/token` |
| Create draft invoice | `POST /v2/invoicing/invoices` |
| Send invoice | `POST /v2/invoicing/invoices/{invoice_id}/send` |
| Verify webhook | `POST /v1/notifications/verify-webhook-signature` |

Docs for verify still show `https://api.sandbox.paypal.com` (no `-m`). We call the `-m` host, which is the current REST host. See comments in `lib/paypal/client.ts`.

### Kenya-based accounts

PayPal Invoicing is often unavailable on Kenya personal/business accounts, including sandbox. If send fails with a permission error, use a **US sandbox Business** app as the merchant (client id/secret) and pay with a **sandbox Personal** buyer. CRAFT still stores the Kenyan creative as the workspace user.

## Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Local Next.js server |
| `npm run build` / `npm start` | Production build |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm test` | Vitest unit suite (completeness, migrations journal, stability score, mappers) |
| `npm run db:generate` | Create a SQL migration from `lib/db/schema.ts` |
| `npm run db:migrate` | Apply migrations |
| `npm run db:seed` | Load the judge demo creative |
| `npm run eval:ownership` | Ownership challenge pass/fail fixture |
| `npm run eval:freeze` | Freeze Shield verifier blocks fabricated claims |
| `npm run eval:suite` | Phase 7 labelled suite + accuracy |

## Environment variables

See `.env.example`. Never commit secrets. Only PayPal **sandbox** keys belong in judge docs.

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | yes | Postgres (local docker defaults in `.env.example`) |
| `AUTH_SECRET` | yes | Auth.js + vault URL HMAC |
| `APP_URL` | yes | Absolute links / signed downloads |
| `PAYPAL_*` | for billing | Sandbox invoicing + webhooks |
| `LLM_*` | optional | Reader, auditor, Freeze Shield phrasing |
| `GITHUB_TOKEN` / `YOUTUBE_API_KEY` | optional | Ownership verification |

## What is real vs simulated

| Real | Simulated / not built yet |
| --- | --- |
| Auth, projects, PayPal sandbox invoice + webhook fund | Live PayPal limitation emails (paste a sample instead) |
| Evidence Vault hashes, timestamps, signed downloads | M-Pesa rails |
| Freeze Shield parse → review → verify → approve → PDF/ZIP | LLM explain of Money *calculations* (amounts stay in code) |
| Copilot over vault + readiness rules with citations | |
| Delivery confirm + public trust page | Brokerage / real investing execution |
| Verified link ownership (not identity) | |
| Income stability and trust score (code only) | |
| Demo seed + eval suite | |

The income stability and trust score is **not** a credit score. Investing, when it lands, is educational and simulated.

**Known limitation: one currency per account.** The Money view adds amounts as plain numbers and does not convert between currencies (for example USD payments against KES spending). Keep payments and planner inputs in the same currency. The demo seed uses USD throughout, and `tests/seed-consistency.test.ts` fails if they ever differ.

## Built after 1 Oct 2026

Everything in this repo for the hackathon was built after 1 Oct 2026, including:

- Auth.js email/password studio, branded landing, theme toggle
- PayPal sandbox invoicing + idempotent webhooks
- Evidence Vault, reader/auditor, completeness in code
- Freeze Shield + fail-closed verifier + PDF packs
- Delivery confirm links and public trust pages
- Onboarding with verified link ownership
- Phase 6 money view, splits, forecast, planner, `/money` UI
- Phase 7 demo seed, eval suite, judge login

## Deploy (Fly.io)

The demo runs on Fly:

| Resource | Name |
| --- | --- |
| Web app | `craft-studio-ke` → https://craft-studio-ke.fly.dev |
| Postgres + pgvector | `craft-studio-ke-db` (private `.internal` only) |
| Vault volume | `craft_vault` → `/app/.data` |

```bash
fly deploy -c fly.toml -a craft-studio-ke
fly deploy -c fly.db.toml -a craft-studio-ke-db   # only if the DB image changes
```

Set runtime secrets with `fly secrets set -a craft-studio-ke` (`DATABASE_URL`, `AUTH_SECRET`, `APP_URL`, optional PayPal/LLM keys). Internal Postgres URLs use `sslmode=disable` (no TLS on Fly 6PN).

`render.yaml` remains as an optional Blueprint. Keep the demo reachable and free until **15 Dec 2026, 8:00 am PT**.

## Licence

MIT. See `LICENSE`.
