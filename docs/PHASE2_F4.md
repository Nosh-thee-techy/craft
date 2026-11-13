# Phase 2 F4 — Reply assistant

- `lib/ai/reply-assistant-core.ts`: draft from vault cites only; deterministic template fallback
- `lib/freeze/reply-service.ts` + `followUpReplyAction`: verify + store a new pack
- Same approve/export gates as the first pack; logged as `reply.draft`
- Freeze Shield UI: follow-up textarea under the letter card
