-- Phase 2 A: account-level vault (nullable project_id + identity fields).
ALTER TABLE "evidence_items" ADD COLUMN IF NOT EXISTS "user_id" uuid;--> statement-breakpoint
UPDATE "evidence_items" AS e
SET "user_id" = p."user_id"
FROM "projects" AS p
WHERE e."project_id" = p."id" AND e."user_id" IS NULL;--> statement-breakpoint
UPDATE "evidence_items" SET "user_id" = "added_by" WHERE "user_id" IS NULL AND "added_by" IS NOT NULL;--> statement-breakpoint
DELETE FROM "evidence_items" WHERE "user_id" IS NULL;--> statement-breakpoint
ALTER TABLE "evidence_items" ALTER COLUMN "user_id" SET NOT NULL;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "evidence_items"
    ADD CONSTRAINT "evidence_items_user_id_users_id_fk"
    FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
ALTER TABLE "evidence_items" ALTER COLUMN "project_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "evidence_items" ADD COLUMN IF NOT EXISTS "doc_date" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "evidence_items" ADD COLUMN IF NOT EXISTS "holder_name" text;--> statement-breakpoint
ALTER TABLE "evidence_items" ADD COLUMN IF NOT EXISTS "issuer" text;--> statement-breakpoint
ALTER TABLE "evidence_items" ADD COLUMN IF NOT EXISTS "address_text" text;--> statement-breakpoint
ALTER TABLE "evidence_items" ADD COLUMN IF NOT EXISTS "expires_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "evidence_items" ADD COLUMN IF NOT EXISTS "extracted_confirmed" boolean DEFAULT false NOT NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "evidence_items_user_idx" ON "evidence_items" USING btree ("user_id");
