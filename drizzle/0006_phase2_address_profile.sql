-- Phase 2 B/C: canonical address + readiness inputs on users.
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "legal_name" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "address_estate" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "address_road" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "address_building" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "address_landmark" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "address_town" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "address_county" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "plus_code" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "income_statement" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "bank_linked_attested" boolean DEFAULT false NOT NULL;
