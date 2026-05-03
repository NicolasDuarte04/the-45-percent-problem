CREATE TABLE "predictions" (
	"id" text PRIMARY KEY NOT NULL,
	"subscriber_id" uuid,
	"email" text,
	"mode" text NOT NULL,
	"scenario" jsonb NOT NULL,
	"story_line" text NOT NULL,
	"count_original" integer NOT NULL,
	"count_current" integer NOT NULL,
	"total" integer DEFAULT 10000 NOT NULL,
	"state" text DEFAULT 'alive' NOT NULL,
	"killed_by" text,
	"model_sha" text NOT NULL,
	"snapshot_sha" text NOT NULL,
	"submitted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "predictions_total_positive" CHECK ("predictions"."total" > 0),
	CONSTRAINT "predictions_count_bounds" CHECK ("predictions"."count_original" >= 0 AND "predictions"."count_original" <= "predictions"."total" AND "predictions"."count_current" >= 0 AND "predictions"."count_current" <= "predictions"."total")
);
--> statement-breakpoint
ALTER TABLE "subscribers" ADD COLUMN "subscription_types" text[] DEFAULT ARRAY['daily_brief']::text[] NOT NULL;--> statement-breakpoint
ALTER TABLE "predictions" ADD CONSTRAINT "predictions_subscriber_id_subscribers_id_fk" FOREIGN KEY ("subscriber_id") REFERENCES "public"."subscribers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_predictions_subscriber_id" ON "predictions" USING btree ("subscriber_id");--> statement-breakpoint
CREATE INDEX "idx_predictions_email_lower" ON "predictions" USING btree (lower("email"));--> statement-breakpoint
CREATE INDEX "idx_predictions_state" ON "predictions" USING btree ("state");--> statement-breakpoint
CREATE INDEX "idx_predictions_submitted_at" ON "predictions" USING btree ("submitted_at" DESC);