CREATE TYPE "public"."dispute_status" AS ENUM('none', 'open', 'won', 'lost');--> statement-breakpoint
CREATE TYPE "public"."ledger_entry_status" AS ENUM('proposed', 'approved', 'rejected');--> statement-breakpoint
CREATE TABLE "planner_inputs" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"currency" text DEFAULT 'KES' NOT NULL,
	"monthly_essential_expenses" numeric(12, 2) NOT NULL,
	"current_buffer" numeric(12, 2) NOT NULL,
	"debts_json" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "planner_inputs_expenses_nonneg" CHECK ("planner_inputs"."monthly_essential_expenses" >= 0),
	CONSTRAINT "planner_inputs_buffer_nonneg" CHECK ("planner_inputs"."current_buffer" >= 0)
);
--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "refunded_amount" numeric(12, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "refunded_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "dispute_status" "dispute_status" DEFAULT 'none' NOT NULL;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "disputed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "ledger_entries" ADD COLUMN "status" "ledger_entry_status" DEFAULT 'proposed' NOT NULL;--> statement-breakpoint
ALTER TABLE "ledger_entries" ADD COLUMN "pct_applied" numeric(5, 2);--> statement-breakpoint
ALTER TABLE "ledger_entries" ADD COLUMN "approved_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "planner_inputs" ADD CONSTRAINT "planner_inputs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_refund_within_amount" CHECK ("payments"."refunded_amount" >= 0 AND "payments"."refunded_amount" <= "payments"."amount");--> statement-breakpoint
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_amount_nonneg" CHECK ("ledger_entries"."amount" >= 0);--> statement-breakpoint
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_approved_has_date" CHECK (("ledger_entries"."status" = 'approved') = ("ledger_entries"."approved_at" IS NOT NULL));--> statement-breakpoint
CREATE UNIQUE INDEX "planner_inputs_user_uidx" ON "planner_inputs" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "ledger_entries_payment_bucket_uidx" ON "ledger_entries" USING btree ("payment_id","bucket");
