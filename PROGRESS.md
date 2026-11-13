# CRAFT — progress so far

Snapshot as of **12 Nov 2026**. Built for the PayPal AI Hackathon.

## In one line

Kenyan creatives stabilize a verified studio profile with Work Proof Tokens, let clients scan-to-verify, then bill via PayPal, deliver with hashes, confirm receipt, defend freezes with a verified pack, and open `/money` for an income stability and trust score — with a judge demo seed and eval suite ready.

## Done by phase

### Phase 0 — Foundations
- Next.js App Router (TypeScript strict), Tailwind, shadcn/ui, AG Grid Community
- Auth.js email + password; protected `(app)` routes
- Drizzle + Postgres/pgvector schema for the full plan tables
- `GET /api/health`, env via typed config, MIT licence
- Branded landing (dusk/light themes, map, marquees)

### Phase 1 — PayPal sandbox round trip
- Create project → send sandbox invoice from the UI
- Webhook marks project `funded` (`INVOICING.INVOICE.PAID` / capture completed)
- Idempotent event handling (unique PayPal event id)
- Kenya workaround documented (US sandbox Business + Personal buyer)

### Phase 2 — Evidence Vault
- Private upload to local vault (`.data/vault`), SHA-256 + server timestamp
- HMAC-signed downloads, checklist completeness **in code** (LLM never scores)
- Optional LLM reader/auditor when `LLM_API_KEY` is set
- AI only reads uploads — never creates or invents evidence
- **Phase 2 Kenya (in progress on `phase-2/kenya-prepare-prove-respond`):** P0 → PA → PB → PE → PC → PD done (Identity vault, address ladder, Freeze ZIP/preflight, readiness checklist, invoice location + pre-check). Still open: F1–F7 AI layer, eval expansion, demo polish.

### Phase 3 — Freeze Shield
- Paste PayPal limitation notice → parse → map to vault → draft letter
- Fail-closed verifier (`lib/ai/claim-check.ts` + `lib/ai/verifier.ts`)
- Human approve → PDF pack export (`pdf-lib`)
- Identity docs PayPal may ask for stay **missing** on purpose
- Live at `/freeze-shield`

### Phase 4 — Delivery + trust
- Mark delivered, hash as `deliverable`, optional publish links
- Match-check vs brief (AI/heuristic)
- Client confirm at `/c/[token]` (no login)
- Public trust page at `/t/[slug]` with visibility controls

### Phase 5 — Onboarding + verified link ownership
- Multi-step onboarding (profile, PayPal marker, links, draft, splits, visibility)
- Challenge codes for GitHub / YouTube / RSS / export
- Wording: **verified link ownership** — never “verified identity”
- Split rules must total 100% (computed in code)

### Layer 1 — Profile + scan-to-verify (hackathon spine)
- Dashboard is profile-first: verified links, Work Proof Tokens (hash certificates), QR
- Public `/t/[slug]` shows link ownership + published proofs; clients scan before paying
- Project detail includes a **client verify card** above Send invoice
- Seed includes demo verified links for Amina
- **Rehema** studio guide (Kabla Karani pattern): bottom-right explainer per room, once per session

### Layer 2 — Secure the job
- Bill → funded webhook + splits → vault → deliver (WPT) → `/c/[token]` confirm → trust updates
- Freeze Shield defends limited funds with vault proof + fail-closed verifier
- Money consumes the job trail (score, forecast, splits, educational invest range)
- Dashboard Layer 2 door strip + Rehema cues labeled for the job loop

### Phase 6 — Money
- Migration `0003`: refund/dispute columns, ledger approval state, `planner_inputs`
- Vitest harness; pure score / cashflow / planner / split / timing / simulate modules
- Deterministic **income stability and trust score** (`lib/scoring/stability.ts`) + locked `clientKey` mapper
- `buildMoneyView` + `getMoneyViewForUser`; live `/money` UI (sample fallback when empty)
- Ledger propose on `fundProject` + approve/reject server actions
- Educational investing range only (never a single promised return)
- **Still optional:** Copilot / LLM explain layer over the view model

### Phase 7 — Seed, eval, docs
- `npm run db:seed` → demo creative **Amina Otieno**
  - Login: `judge@craft.demo` / `CraftJudge2026!`
  - 5 projects (evidence gaps), payments, synthetic history (`is_synthetic=true`), pasted notice
- `npm run eval:suite` → 18 labelled cases, **100%**, fabricated claim blocked
- README: judge quick start, env table, real vs simulated, built-after-1-Oct list

## Product rules we kept
- Money, splits, scores, forecasts → deterministic code; LLM explains only
- AI never invents evidence
- Outbound packs pass the verifier; export needs verify + user approve
- Agent steps logged to append-only `agent_actions`
- Say “income stability and trust score”, never “credit score”

## What’s left

| Owner | Work |
| --- | --- |
| Optional | Copilot / LLM explain layer over the Money view (numbers stay in code) |
| Team | Public demo URL live through **15 Dec 2026, 8:00 am PT** |
| Team | Demo video &lt; 3 min on YouTube (script in `CRAFT_BUILD_PLAN.md`) |
| Team | Hackathon submission text (features + AI tools/models used) |
| Optional | Wire PayPal sandbox on the hosted demo; smoke-test judge login there |

## How to run what we built

```bash
cp .env.example .env.local   # set AUTH_SECRET; APP_URL=http://localhost:3000
docker compose up -d
npm install
npm run db:migrate
npm run db:seed
npm run dev
```

Checks:

```bash
npm test
npm run eval:suite
npm run eval:freeze
npm run eval:ownership
```

## Key paths

| Path | Role |
| --- | --- |
| `/dashboard` | Layer 1 studio profile + Work Proof Tokens + QR |
| `/projects` | Bill + project detail (client verify card first) |
| `/vault` | Evidence |
| `/freeze-shield` | Limitation response pack |
| `/settings` | Trust visibility |
| `/t/amina-studio` | Public scan-to-verify page after seed |
| `/money` | Score, forecast band, plan, splits, investing range |
| `/copilot` | Placeholder (optional explain layer) |

## Live deploy

- **URL:** https://craft-studio-ke.fly.dev
- **Judge login:** `judge@craft.demo` / `CraftJudge2026!`
- Fly apps: `craft-studio-ke` (Next.js) + `craft-studio-ke-db` (pgvector)

## Repo note

Work is on `main` at [Nosh-thee-techy/craft](https://github.com/Nosh-thee-techy/craft). Phase 6 foundations landed via PR #1; Freeze Shield and Phase 7 followed on `main`.
