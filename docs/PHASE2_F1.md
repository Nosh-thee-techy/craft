# Phase 2 F1 — Document reader

- `lib/ai/doc-reader-core.ts` + schemas: name, issuer, date, address, amount with confidence
- Stored in `evidence.extracted_json` with `extracted_confirmed = false` until the user confirms
- Cache by SHA-256; 20s timeout → manual envelope (`status: timeout`)
- Vault confirm panel; readiness must ignore unconfirmed fields
- Logged as `extract.document` in `agent_actions`
- Tests: success, invalid JSON, timeout, low confidence, zod failure
