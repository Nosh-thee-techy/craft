-- Phase 2 P0: account-level evidence types + notice deadline_at.
ALTER TYPE "public"."evidence_type" ADD VALUE IF NOT EXISTS 'id_document';--> statement-breakpoint
ALTER TYPE "public"."evidence_type" ADD VALUE IF NOT EXISTS 'address_proof';--> statement-breakpoint
ALTER TYPE "public"."evidence_type" ADD VALUE IF NOT EXISTS 'bank_statement';--> statement-breakpoint
ALTER TYPE "public"."evidence_type" ADD VALUE IF NOT EXISTS 'source_of_funds';--> statement-breakpoint
ALTER TYPE "public"."evidence_type" ADD VALUE IF NOT EXISTS 'employment_proof';--> statement-breakpoint
ALTER TABLE "limitation_notices" ADD COLUMN IF NOT EXISTS "deadline_at" timestamp with time zone;
