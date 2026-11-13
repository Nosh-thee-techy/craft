# Phase 2 F2 — Notice understanding

- `lib/ai/notice-understanding-core.ts`: LLM primary, heuristic fallback
- Both paths validate with `parsedNoticeSchema`
- 20s timeout via `completeJson({ timeoutMs })`
- `parseLimitationNotice` logs `source: llm | heuristic` on `freeze.parse`
- Tests: LLM success, timeout, invalid JSON, heuristic-only, deadlineAt fill
