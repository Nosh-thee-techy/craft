# CRAFT

Creators' Records, Assurance, Funds & Trust.

A PayPal-centred workspace for Kenyan creatives: get paid, prove the work, survive a PayPal limitation, and plan the money.

Built for the PayPal AI Hackathon.

## Brand

Dusk (dark glass) is the default studio. **White mode** is a paper-and-gold light theme — same glass, same type, remembered in the browser. Toggle it from the sun/moon control on the landing page, login, and the app rail.

The landing map (`#map`) is the second section: a 3×2 pictured board of rooms (studio → bill → vault → client page, with a pink stuck-money fork). Rooms sit in a CSS grid so the board cannot collapse. A scrolling craft-name marquee sits above and below the map as the section border.

Login and signup are a split studio door: a Nairobi photographer at work on one side, the form on the other.

## What works now (Phase 0–2 + Phase 4)

- Next.js App Router (TypeScript strict), Tailwind, shadcn/ui primitives, AG Grid Community
- Auth.js email + password login; `(app)` routes are protected
- Drizzle schema for every table in `CRAFT_BUILD_PLAN.md` §4
- `GET /api/health`
- **PayPal sandbox round trip:** create a project, send an invoice, webhook marks it `funded`
- **Evidence Vault:** private upload, SHA-256, server timestamp, signed download, checklist score (in code), optional LLM reader/auditor
- **Delivery + trust (Phase 4):** mark a project delivered, AI match-check vs the brief, client confirm at `/c/[token]`, public trust page at `/t/[slug]`

Phase 3 (Freeze Shield) is owned separately and is not in this branch of work.

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

3. Install, migrate, run:

   ```bash
   npm install
   npm run db:migrate
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000), sign up, then visit `/projects`.

## Evidence Vault (Phase 2)

Open `/vault` after you have a project. Files land in `.data/vault` locally (gitignored) with an HMAC-signed download that expires in 15 minutes. Completeness is `present types / 6`, computed in `lib/evidence/completeness.ts` — the LLM never calculates it.

Set `LLM_API_KEY` (and optional `LLM_MODEL`, `LLM_BASE_URL`) to enable vision/JSON extraction and embeddings into `doc_chunks`. Without a key, uploads still hash and store; the auditor lists missing checklist types in plain language.

The AI only reads uploaded bytes. It cannot create evidence rows.

## Delivery, confirm, trust (Phase 4)

On a funded project, open the detail page and upload the final file. CRAFT:

1. Hashes the file into the Evidence Vault as type `deliverable` with a server timestamp
2. Stores optional publish links (public URLs only)
3. Runs an AI/heuristic match of the file text against the project scope and shows mismatches
4. Creates a one-click confirm link at `/c/[token]` — no login; stamps `client_confirmed_at`
5. Lets you choose visibility under **Settings** for `/t/[slug]` (counts, portfolio, quote button)

Private vault files are never exposed on confirm or trust pages. Portfolio links and publish URLs are the only outbound file references.

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
| `npm run db:generate` | Create a SQL migration from `lib/db/schema.ts` |
| `npm run db:migrate` | Apply migrations |

## Environment variables

See `.env.example`. Never commit secrets. Only PayPal **sandbox** keys belong in judge docs later.

## What is real vs not yet built

| Real | Later |
| --- | --- |
| Login, protected routes, health, schema | Freeze Shield + verifier (Phase 3, separate) |
| Projects UI, PayPal invoice send, webhook fund | Verified link ownership (Phase 5) |
| Evidence Vault (hash, signed download, auditor) | Score, forecast, copilot (Phase 6) |
| Delivery, client confirm, public trust page | Demo seed + eval set (Phase 7) |

The income stability and trust score is **not** a credit score. Investing, when it lands, is educational and simulated.

## Deploy

A public HTTPS URL is required so PayPal can deliver webhooks. **Fly.io** is the intended host (`fly launch` from this repo when you are ready). `render.yaml` remains as an optional Blueprint. Locally the app runs at `http://localhost:3000`; use a tunnel (ngrok/Cloudflare) against `/api/paypal/webhook` until Fly is live.

## Licence

MIT. See `LICENSE`.
