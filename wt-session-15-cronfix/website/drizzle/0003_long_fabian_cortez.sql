CREATE TABLE "match_outcomes" (
	"match_id" text PRIMARY KEY NOT NULL,
	"competition" text NOT NULL,
	"stage" text NOT NULL,
	"home_team" varchar(3) NOT NULL,
	"away_team" varchar(3) NOT NULL,
	"home_goals" integer NOT NULL,
	"away_goals" integer NOT NULL,
	"shootout_winner" varchar(3),
	"settled_at" timestamp with time zone NOT NULL,
	"entered_at" timestamp with time zone DEFAULT now() NOT NULL,
	"entered_by" text NOT NULL,
	"meta" jsonb DEFAULT '{}'::jsonb,
	CONSTRAINT "match_outcomes_goals_non_negative" CHECK ("match_outcomes"."home_goals" >= 0 AND "match_outcomes"."away_goals" >= 0)
);
--> statement-breakpoint
CREATE TABLE "prediction_state_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"prediction_id" text NOT NULL,
	"previous_state" text NOT NULL,
	"new_state" text NOT NULL,
	"previous_count_current" integer NOT NULL,
	"new_count_current" integer NOT NULL,
	"triggered_by_match_id" text,
	"reason" text NOT NULL,
	"evaluated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"evaluator_version" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "prediction_state_log" ADD CONSTRAINT "prediction_state_log_prediction_id_predictions_id_fk" FOREIGN KEY ("prediction_id") REFERENCES "public"."predictions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prediction_state_log" ADD CONSTRAINT "prediction_state_log_triggered_by_match_id_match_outcomes_match_id_fk" FOREIGN KEY ("triggered_by_match_id") REFERENCES "public"."match_outcomes"("match_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_match_outcomes_stage" ON "match_outcomes" USING btree ("stage");--> statement-breakpoint
CREATE INDEX "idx_match_outcomes_settled_at" ON "match_outcomes" USING btree ("settled_at");--> statement-breakpoint
CREATE INDEX "idx_prediction_state_log_prediction" ON "prediction_state_log" USING btree ("prediction_id");--> statement-breakpoint
CREATE INDEX "idx_prediction_state_log_evaluated_at" ON "prediction_state_log" USING btree ("evaluated_at" DESC);