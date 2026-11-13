# Phase 2 P0 — fixes log

Branch: `phase-2/kenya-prepare-prove-respond`

## F4 — parse path (traced before changing)

`lib/ai/freezeShield.ts` → `parseLimitationNotice`:

1. Always runs `heuristicParse(rawText)` first (seed + offline fallback).
2. Then tries `completeJson` (LLM) with the same `parsedNoticeSchema`.
3. On any LLM failure (no key, timeout, invalid JSON), keeps the heuristic result.

So the **LLM is primary when available**; the **heuristic is the deterministic fallback**. Comment in code previously said “Heuristics first; LLM may refine” — that was misleading about priority; the implementation already preferred a successful LLM parse.

## F1–F3, F5–F6

| Fix | Change |
|---|---|
| F1 | Split `other` into account-level evidence types; project completeness unchanged |
| F2 | `deadlineAt` on parsed notice + `limitation_notices.deadline_at` |
| F3 | Kenya phrases in `parse-heuristic.ts` |
| F5 | `tests/freeze-parser.test.ts`, `tests/freeze-gates.test.ts` |
| F6 | Copilot removed from `components/app-nav.tsx` until built |
