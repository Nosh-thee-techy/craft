# Phase 2 F6 — Copilot

- `lib/ai/copilot-core.ts` + `lib/ai/copilot.ts`: answers only from retrieved vault/rules snippets
- No retrieved source → “I don't know”; citations filtered to retrieved ids
- Real `/copilot` page; Copilot restored in app nav
- Logged as `copilot.answer`; tool path is read-only
