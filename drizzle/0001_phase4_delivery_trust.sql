ALTER TABLE "users" ADD COLUMN "public_slug" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "trust_visibility_json" jsonb;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "show_on_trust" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "deliverables" ADD COLUMN "confirm_token" text;--> statement-breakpoint
ALTER TABLE "deliverables" ADD COLUMN "publish_links_json" jsonb;--> statement-breakpoint
ALTER TABLE "deliverables" ADD COLUMN "match_check_json" jsonb;--> statement-breakpoint
UPDATE "deliverables" SET "confirm_token" = gen_random_uuid()::text WHERE "confirm_token" IS NULL;--> statement-breakpoint
ALTER TABLE "deliverables" ALTER COLUMN "confirm_token" SET NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "users_public_slug_uidx" ON "users" USING btree ("public_slug");--> statement-breakpoint
CREATE UNIQUE INDEX "deliverables_confirm_token_uidx" ON "deliverables" USING btree ("confirm_token");
