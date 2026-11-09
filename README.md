# CRAFT

Creators' Records, Assurance, Funds & Trust.

A PayPal-centred workspace for Kenyan creatives: get paid, prove the work, survive a PayPal limitation, and plan the money.

Built for the PayPal AI Hackathon. Phase 0 is the blank, authenticated app. Feature work starts in Phase 1.

## What this is (Phase 0)

- Next.js App Router (TypeScript strict), Tailwind, shadcn/ui primitives
- Auth.js email + password login
- Drizzle schema for every table in `CRAFT_BUILD_PLAN.md` §4
- `GET /api/health`
- Protected `(app)` routes
- PayPal webhook route exists but returns 501 until Phase 1

## Setup

1. Copy env and generate a secret:

   ```bash
   cp .env.example .env.local
   node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
   ```

   Put the printed value in `AUTH_SECRET`. Keep `APP_URL=http://localhost:3000`.

2. Start Postgres (pgvector image):

   ```bash
   docker compose up -d
   ```

3. Install, migrate, run:

   ```bash
   npm install
   npm run db:generate
   npm run db:migrate
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000), sign up, then visit `/dashboard`.

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

See `.env.example`. Never commit secrets. Only PayPal **sandbox** keys belong in this repo's judge docs later.

## What is real vs not yet built

| Real in Phase 0 | Later |
| --- | --- |
| Login, protected routes, health, schema, migrations | PayPal invoice round trip (Phase 1) |
| | Evidence Vault (Phase 2) |
| | Freeze Shield + verifier (Phase 3) |
| | Trust page / client confirm (Phase 4) |
| | Verified link ownership (Phase 5) |
| | Score, forecast, copilot (Phase 6) |
| | Demo seed + eval set (Phase 7) |

The income stability and trust score is **not** a credit score. Investing, when it lands, is educational and simulated.

## Licence

MIT. See `LICENSE`.
