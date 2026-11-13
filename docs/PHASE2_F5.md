# Phase 2 F5 — Readiness coach

- `lib/ai/readiness-coach-core.ts`: plan steps from failed `computeReadiness` checks only
- Wired in `getReadinessForUser`; logged as `readiness.coach`
- Dashboard `ReadinessCard` shows coach headline + steps
- LLM may only reword; never invents checks, freeze predictions, or a credit score
