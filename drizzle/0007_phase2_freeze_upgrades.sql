-- Phase 2 E: case status, bundle key, preflight JSON on packs/notices.
ALTER TABLE "limitation_notices" ADD COLUMN IF NOT EXISTS "case_status" text;--> statement-breakpoint
ALTER TABLE "limitation_notices" ADD COLUMN IF NOT EXISTS "status_updated_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "response_packs" ADD COLUMN IF NOT EXISTS "bundle_key" text;--> statement-breakpoint
ALTER TABLE "response_packs" ADD COLUMN IF NOT EXISTS "preflight_json" jsonb;
