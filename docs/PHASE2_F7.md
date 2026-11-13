# Phase 2 F7 — Invoice flag explainer

- `lib/ai/invoice-flag-explainer-core.ts`: one sentence + attach-first per flag
- Flag set frozen from `checkInvoice`; LLM cannot add or remove a code
- Wired in `precheckProjectInvoice`; shown on Send invoice UI
- Logged as `invoice.flag_explain`
