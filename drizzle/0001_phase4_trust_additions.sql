CREATE TABLE "quote_requests" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"requester_name" text NOT NULL,
	"requester_email" text NOT NULL,
	"message" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "deliverables" ADD COLUMN "confirm_token_hash" text;--> statement-breakpoint
ALTER TABLE "deliverables" ADD COLUMN "publish_links" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "deliverables" ADD COLUMN "match_result" jsonb;--> statement-breakpoint
ALTER TABLE "evidence_items" ADD COLUMN "is_public" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "is_public" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "public_client_label" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "trust_slug" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "trust_published" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "trust_show_client_names" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "quote_requests" ADD CONSTRAINT "quote_requests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "quote_requests_user_idx" ON "quote_requests" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "deliverables_confirm_token_uidx" ON "deliverables" USING btree ("confirm_token_hash");--> statement-breakpoint
CREATE UNIQUE INDEX "users_trust_slug_uidx" ON "users" USING btree ("trust_slug");