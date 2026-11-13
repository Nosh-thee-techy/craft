# Phase 2 F3 — Pack reviewer

- `lib/ai/pack-reviewer-core.ts`: second-pass “PayPal reviewer” over a mapped pack
- Gaps must cite a missing request label or documentType; uncitable gaps are dropped
- Wired into `runFreezeShield` after mapping; logged as `pack.review`
- Shown on Freeze Shield under “What a reviewer may still ask for”
- Tests: deterministic path, LLM invent drop, LLM failure fallback
