# Phase 2 PA — account-level vault

- `evidence_items.user_id` required; `project_id` nullable for Identity and funds.
- Fields: `holder_name`, `issuer`, `address_text`, `doc_date`, `expires_at`, `extracted_confirmed`.
- Vault UI: Identity and funds section (optional, redaction copy, reported reasons).
- Freeze mapping loads account rows via `user_id`; missing reasons point at Identity and funds.
- Public filter: `publicEvidenceRows` + trust join skips account types.
