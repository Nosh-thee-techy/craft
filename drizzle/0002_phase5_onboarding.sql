ALTER TABLE "users" ADD COLUMN "profile_draft_json" jsonb;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "profile_draft_approved_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "paypal_sandbox_connected_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "onboarding_completed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "linked_accounts" ADD COLUMN "public_data_json" jsonb;
