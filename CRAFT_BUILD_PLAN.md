# CRAFT: Cursor Build Plan

CRAFT = Creators' Records, Assurance, Funds & Trust.
A PayPal-centred workspace for Kenyan creatives: get paid, prove the work, survive a PayPal limitation, and plan the money.
Built for the PayPal AI Hackathon. Deadline: Thu 12 Nov 2026, 12:00 pm PST (23:00 Nairobi). Aim to submit Wed night.

How to use this file: put it in the repo root. Add Section 1 to `.cursorrules` (or Cursor project rules). Then paste one phase prompt at a time and do not start the next phase until the acceptance checks pass.

---

## 1. Rules for Cursor (copy into `.cursorrules`)

```text
You are building CRAFT, a Next.js (TypeScript) app. Follow these rules in every change.

CODE QUALITY
- TypeScript strict mode. No `any` unless commented with a reason.
- Comment all code well: every file starts with a short header comment (purpose, inputs, outputs).
  Every function gets a doc comment. Explain WHY for any non-obvious logic.
- Small files, one responsibility each. Keep route handlers thin; put logic in /lib.
- Validate all external input with zod (API bodies, webhook payloads, LLM outputs).
- Never hardcode secrets. Read from env via a single typed `lib/env.ts`.

PRODUCT RULES (non-negotiable)
- Money amounts, splits, buffer sizes, forecasts and scores are computed in deterministic code.
  The LLM may only EXPLAIN them in words. It never calculates money.
- The AI never creates, alters or invents evidence. It only reads and organises what the user uploaded.
- Every agent output that leaves the app (pack, letter, message) must pass the verifier in
  `lib/ai/verifier.ts`, which checks each claim against uploaded source text.
- Every agent action is written to the append-only `agent_actions` table.
- Webhooks are idempotent: store the PayPal event id with a unique constraint; ignore duplicates.
- Say "verified link ownership", never "verified identity" or "verified authorship".
- Call the score an "income stability and trust score". Never "credit score".
- Investing features are educational and simulated. No trading, no promised returns, ranges only.

STACK
- Next.js App Router, Tailwind, shadcn/ui, AG Grid Community, PostgreSQL + Drizzle,
  pgvector, S3-compatible private storage with signed URLs, Auth.js, zod, pdf-lib.
- One LLM wrapper at `lib/ai/client.ts` (tool calling, JSON-schema outputs, vision). Provider is swappable.
- PayPal sandbox only. Confirm endpoint paths and event names against PayPal's current docs before using them.

WORKFLOW
- Work in small steps. After each step, run typecheck and lint, and fix errors before moving on.
- Add or update the README section for any feature you finish.
```

---

## 2. Repo structure

```text
craft/
  app/
    (auth)/ login, signup
    (app)/ dashboard, projects, projects/[id], vault, freeze-shield, money, copilot, settings
    onboarding/
    t/[slug]/            public client trust page
    c/[token]/           client confirm-receipt page
    api/
      paypal/webhook/route.ts
      projects/ invoices/ evidence/ notices/ packs/ verify-link/ forecast/ copilot/
  lib/
    env.ts
    db/ schema.ts, client.ts, seed.ts
    paypal/ client.ts, invoices.ts, webhook.ts
    ai/ client.ts, schemas.ts, reader.ts, auditor.ts, freezeShield.ts, verifier.ts,
        profile.ts, forecastExplain.ts, planner.ts, copilot.ts
    evidence/ hash.ts, storage.ts, completeness.ts
    scoring/ stability.ts
    forecast/ timing.ts, cashflow.ts
    planner/ rules.ts, simulate.ts
    verify/ github.ts, youtube.ts, rss.ts, challenge.ts
    pdf/ pack.ts
  data/
    seed/ demo account, projects, payments, notices
    eval/ 15-20 labelled notices and statements with expected outputs
  README.md
  .env.example
  LICENSE
```

---

## 3. Environment variables (`.env.example`)

```text
DATABASE_URL=
AUTH_SECRET=
APP_URL=
PAYPAL_ENV=sandbox
PAYPAL_CLIENT_ID=
PAYPAL_CLIENT_SECRET=
PAYPAL_WEBHOOK_ID=
LLM_API_KEY=
LLM_MODEL=
STORAGE_ENDPOINT=
STORAGE_BUCKET=
STORAGE_ACCESS_KEY=
STORAGE_SECRET_KEY=
GITHUB_TOKEN=            # optional, raises API rate limits
YOUTUBE_API_KEY=
```

Only sandbox keys go in the README for judges. Put a spending cap on any LLM key a judge can use.

---

## 4. Core data model (Drizzle)

Tables and key columns. Add `created_at` and `updated_at` to all.

| Table | Key columns |
| --- | --- |
| users | id, email, name, craft, country |
| linked_accounts | user_id, platform, handle, url, challenge_code, verified_at, status |
| projects | user_id, client_name, client_email, scope, currency, amount, status (draft, invoiced, funded, delivered, closed), trust_slug |
| invoices | project_id, paypal_invoice_id, status, amount, currency, sent_at, paid_at |
| payments | project_id, paypal_capture_id, amount, currency, received_at, source |
| paypal_events | event_id (unique), event_type, payload, processed_at |
| evidence_items | project_id, type (contract, invoice, payment, deliverable, comms, portfolio_link), storage_key, sha256, extracted_text, extracted_json, added_by, added_at |
| deliverables | project_id, evidence_item_id, delivered_at, client_confirmed_at |
| limitation_notices | user_id, raw_text, parsed_json, received_at |
| response_packs | notice_id, status, pdf_key, verifier_report_json |
| split_rules | user_id, tax_pct, savings_pct, expenses_pct |
| ledger_entries | user_id, payment_id, bucket, amount |
| client_payment_history | user_id, client_name, invoice_date, paid_date (synthetic in demo) |
| score_snapshots | user_id, score, components_json, created_at |
| plans | user_id, month, buffer_target, steps_json, explanation |
| agent_actions | id, user_id, action, input_json, output_json, verifier_passed, approved_by_user, created_at (append-only) |
| doc_chunks | user_id, evidence_item_id, chunk_text, embedding (pgvector) |

---

## 5. Phases

Do them in order. Each phase ends with acceptance checks. PayPal comes first because it is the riskiest piece and the hackathon fails entries where PayPal is not central.

### Phase 0: Setup and deploy (do this first)

Goal: a blank app live on Render with a public URL, so PayPal webhooks work from day one.

Tasks
- Scaffold Next.js (TypeScript, App Router, Tailwind), add shadcn/ui, zod, Drizzle.
- Create the Postgres database and run the first migration.
- Auth.js with email login. Protected `(app)` routes.
- `lib/env.ts` with zod validation. `GET /api/health`.
- Deploy to Render. Confirm the public URL loads.
- Create the GitHub repo (public), add an MIT licence file, README skeleton.

Cursor prompt
```text
Scaffold the CRAFT app per CRAFT_BUILD_PLAN.md sections 2-4. Set up Next.js App Router with TypeScript strict,
Tailwind, shadcn/ui, Drizzle + Postgres, Auth.js, and a typed lib/env.ts using zod. Create schema.ts for the tables
in section 4 and generate the first migration. Add GET /api/health and protected (app) routes. Comment every file.
Do not build features yet.
```

Acceptance
- [ ] App is live on a public Render URL
- [ ] Login works and (app) routes are protected
- [ ] Migration applied, health route returns OK
- [ ] LICENSE file visible on the GitHub repo page

### Phase 1: PayPal round trip (riskiest piece)

Goal: create a project, send a PayPal sandbox invoice, receive the webhook, mark it paid.

Tasks
- PayPal client: OAuth token fetch with caching.
- Create and send an invoice from a project (Invoicing API, sandbox).
- Webhook endpoint with signature verification and idempotent storage in `paypal_events`.
- Handle invoice-paid and payment-capture events, create `payments`, set project to `funded`.
- Projects UI: list in AG Grid, create form, detail page.

Cursor prompt
```text
Implement the PayPal sandbox round trip. Build lib/paypal/client.ts (OAuth token with caching),
lib/paypal/invoices.ts (create and send an invoice from a project), and app/api/paypal/webhook/route.ts.
The webhook must verify the signature using PayPal's verification API, insert the event id into paypal_events with a
unique constraint (ignore duplicates), then handle invoice-paid and capture-completed events by creating a payments
row and setting the project status to funded. Confirm endpoint paths and event names against PayPal's current docs
and note any differences in comments. Build the projects page with an AG Grid table, a create-project form, and a
project detail page. Comment all code.
```

Acceptance
- [ ] Invoice sent in sandbox from the UI
- [ ] Paying it as the sandbox buyer triggers the webhook on the live URL
- [ ] Project becomes funded; duplicate webhook deliveries create no duplicate payments
- [ ] Verify early: Kenya-based account can create invoices and webhooks. If not, note the workaround.

### Phase 2: Evidence Vault and AI auditor

Goal: every project builds a proof pack, and AI finds the gaps.

Tasks
- Private file upload, SHA-256 hash, server-side timestamp, signed URLs for download.
- `evidence_items` per project with a checklist (contract, invoice, payment, deliverables, comms, portfolio links).
- Document reader: vision plus structured extraction into `extracted_json`, with a confidence per field.
- Chunk and embed extracted text into `doc_chunks`.
- Evidence auditor: reads a project's items and returns a gap list and questions for the creative.
- Completeness score per project, computed in code from the checklist.
- Vault UI: AG Grid ledger of evidence with filters.

Cursor prompt
```text
Build the Evidence Vault. Implement private upload to S3-compatible storage with signed URLs, a SHA-256 hash and a
server-side timestamp on every item, and the evidence_items table flow. Add lib/ai/reader.ts (vision plus structured
extraction with zod schemas and a confidence per field) and lib/ai/auditor.ts (given a project's evidence, return
missing items and targeted questions). Compute the completeness score in lib/evidence/completeness.ts as plain
deterministic code, not with the LLM. Embed extracted text into doc_chunks with pgvector. Build the Vault page with an
AG Grid ledger. The AI must only read what the user uploaded and must never create evidence. Write each AI call to
agent_actions. Comment all code.
```

Acceptance
- [ ] Upload produces a hash and timestamp visible in the UI
- [ ] Auditor flags a deliberately missing delivery proof in the demo project
- [ ] Completeness score changes when items are added

### Phase 3: Freeze Shield with verifier

Goal: paste a PayPal limitation notice, get a reviewable response pack.

Tasks
- Notice intake page. Parse the notice into structured requests (documents requested, deadlines, tone).
- Map each request to vault items and show covered versus missing.
- Draft a cover letter that cites only uploaded items.
- Verifier: second LLM call that checks every claim in the letter and pack index against source text. Fails closed.
- Build the pack as a PDF (cover letter, index, evidence list with hashes and timestamps).
- Approval step before export. Log everything to `agent_actions`.

Cursor prompt
```text
Build Freeze Shield. Page where the user pastes a PayPal limitation notice. lib/ai/freezeShield.ts parses it into a
zod-validated list of requested documents, then maps each request to the user's evidence_items (use the pgvector
search and the item types), producing covered and missing lists. Draft a cover letter that only references uploaded
items. Implement lib/ai/verifier.ts: a separate LLM call that checks each claim in the letter and index against the
source text and returns pass or fail per claim with reasons; the export button must stay disabled until all claims
pass and the user approves. Build lib/pdf/pack.ts with pdf-lib: cover letter, index, evidence list with hashes and
timestamps. Add a test fixture in data/eval for a letter containing a fabricated claim and show the verifier blocking
it. Log every step to agent_actions. Comment all code.
```

Acceptance
- [ ] The seeded notice produces a correct covered and missing list
- [ ] The fabricated-claim fixture is blocked by the verifier
- [ ] PDF exports only after approval

### Phase 4: Work verification, client confirmation, trust page

Tasks
- At delivery: upload final file, hash it, record the time, add publish links.
- AI check that the deliverable matches the invoice description. Show any mismatch.
- Client confirm page `c/[token]` with one-click receipt confirmation, stored as `client_confirmed_at`.
- Public trust page `t/[slug]`: verified project count, delivery rate, client confirmations, selected portfolio, PayPal checkout or quote request button. The creative chooses what is visible.

Cursor prompt
```text
Build work verification and the trust page. On delivery, hash the file and record a server timestamp, store publish
links, and run an AI check that the deliverable matches the invoice description, showing mismatches. Create a public
route c/[token] where a client confirms receipt with one click (store client_confirmed_at). Create the public route
t/[slug] showing only what the creative has marked visible: verified project count, delivery rate, client
confirmations, selected portfolio items, and a PayPal checkout button for new work. Never expose private files; claims
link to evidence summaries only. Comment all code.
```

Acceptance
- [ ] Confirm link works without login
- [ ] Trust page hides anything the creative did not publish

### Phase 5: Onboarding and link ownership

Tasks
- Multi-step onboarding: profile, connect PayPal (sandbox), add usernames or URLs, verify ownership, read public data, AI profile draft, optional history upload, money setup, visibility.
- Ownership challenge: generate a code, user places it in a bio or pinned post, server fetches and checks.
- Official sources only: GitHub API, YouTube API, RSS/oEmbed. Upload-an-export fallback for everything else.
- AI profile draft from verified links. User edits and approves.

Cursor prompt
```text
Build onboarding. Steps: who you are, connect PayPal sandbox, add usernames or URLs, verify ownership, read public
data, AI profile draft, optional history upload, money setup (split rules), visibility choices. lib/verify/challenge.ts
generates a short code per linked account and checks it server-side by fetching the public page or API. Support
GitHub (API), YouTube (API), and RSS/oEmbed blogs only, plus an upload-an-export or screenshot fallback that uses the
document reader. Do not scrape pages that prohibit it. lib/ai/profile.ts drafts a summary, services and timeline from
verified data; the user must approve. Use the wording "verified link ownership". The user can skip optional steps.
Comment all code.
```

Acceptance
- [ ] A real GitHub or YouTube handle passes the code challenge; a wrong one fails
- [ ] Profile draft is editable and nothing sensitive is inferred

### Phase 6: Money, AI forecast, stability score, investing plan, Copilot

Tasks
- Stability and trust score in `lib/scoring/stability.ts`: payment regularity, client diversity, income variance, evidence completeness, dispute and refund rate, delivery confirmations. Each point explainable. Deterministic.
- Payment-timing model: gradient-boosted days-to-pay per client. Train on clearly labelled synthetic histories. Small Python service (FastAPI) or a simpler statistical version in TypeScript if time is short.
- Cash-flow forecaster: three months, low to high band, lean-month warnings.
- Split proposals on each payment (rules in code, user approves).
- Planner rules engine: buffer sized to income volatility, then debt, then long-term investing. LLM explains only.
- Investing simulation: contributions and projected ranges, never a single return. Education only.
- Copilot: chat with tool calling over projects, evidence, payments, forecast, plan.

Cursor prompt
```text
Build the money and AI layer. 1) lib/scoring/stability.ts: deterministic score from payment regularity, client
diversity, income variance, evidence completeness, refund rate and delivery confirmations, returning per-component
points so every point is explainable. 2) lib/forecast/timing.ts: a days-to-pay model per client (small FastAPI service
or a statistical fallback), trained on synthetic client_payment_history clearly labelled as synthetic. 3)
lib/forecast/cashflow.ts: three-month forecast with low and high bands and lean-month warnings. 4) lib/planner/rules.ts:
deterministic rules that size an emergency buffer from income volatility, then debt, then long-term investing, and
lib/planner/simulate.ts for projected ranges. 5) lib/ai/planner.ts and forecastExplain.ts: the LLM only explains the
numbers in code, with numbers from code
```

Acceptance
- [ ] Score components add up and each has a plain-language reason
- [ ] Forecast shows a band, not a single number
- [ ] Copilot answers "how much can I safely invest this month?" using real data, with numbers from code

### Phase 7: Seed, evaluation, polish, submission

Tasks
- Seed a demo creative with several projects, payments, evidence, one realistic pasted freeze notice, and synthetic payment history.
- Evaluation set in `data/eval/` with 15 to 20 notices and statements with expected outputs. A script that prints accuracy. Include the fabricated-claim case.
- README: what it is, setup, env vars, sandbox test logins, how to run, what is simulated, what is new since Oct 1, 2026.
- Keep everything live and free to access until 15 Dec 2026, 8:00 am PT.
- Demo video under 3 minutes (script below), public on YouTube.

Cursor prompt
```text
Create data/seed with a demo creative: 5 projects, payments, evidence with gaps, one realistic pasted PayPal
limitation notice, and synthetic client payment histories. Create data/eval with 15-20 labelled notices and statements
and a script that runs the reader, auditor, freezeShield and verifier against them and prints accuracy, including a
case where the letter contains a fabricated claim that the verifier must block. Write the README: overview, setup, env
vars, sandbox test login for judges, run instructions, what is real versus simulated, and a list of what was built
after 1 Oct 2026. Comment all code.
```

Acceptance
- [ ] A fresh clone runs from the README alone
- [ ] Judge login works with no setup
- [ ] Eval script prints accuracy and shows the verifier blocking the fabricated claim

---

## 6. Demo video script (under 3 minutes)

1. 0:00 The problem: a Kenyan creative, paid on PayPal, money frozen with no organised proof.
2. 0:20 Create a project, AI drafts the invoice, send it through PayPal sandbox.
3. 0:45 Client pays. Webhook fires. Project funded. Evidence vault fills; the AI flags a gap.
4. 1:15 Delivery: hash, timestamp, client confirms, trust page updates.
5. 1:35 The freeze: paste the notice. Agent maps requests to evidence. The verifier blocks a fabricated claim. Approve, export the pack.
6. 2:15 Forecast and plan: stability score, income band, safe amount to invest, simulated range.
7. 2:40 One line on honesty: what is real (PayPal sandbox, vault, agent) and what is simulated (freeze, M-Pesa, investing execution). Close on impact.

---

## 7. Submission checklist

- [ ] Public repo with a detectable open-source licence
- [ ] Working demo URL, live until 15 Dec 2026
- [ ] Public YouTube video under 3 minutes, in English
- [ ] Text description of features and functionality
- [ ] Statement naming every AI tool and model, and what each does
- [ ] Testing instructions and sandbox logins in the README
- [ ] Explanation of what was significantly updated after 1 Oct 2026 (only if reusing earlier work)
- [ ] Sponsor tools used only where genuinely integrated (AG Grid, Render, APIMatic)
- [ ] Trial licences and credits will not expire before 15 Dec 2026
- [ ] Submitted before Thu 12 Nov 2026, 23:00 Nairobi (aim for Wed night)

---

## 8. If time runs short, cut in this order

1. Python forecast service (use simple statistics in TypeScript)
2. YouTube and RSS verification (keep GitHub plus the upload fallback)
3. Investing simulation (keep the buffer and forecast)
4. Copilot chat (keep one or two fixed questions)

Never cut: the PayPal round trip, the Evidence Vault, Freeze Shield with the verifier, and the demo video.
