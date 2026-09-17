CREATE TABLE "matches" (
	"match_id" varchar(8) PRIMARY KEY NOT NULL,
	"round" text NOT NULL,
	"matchday" smallint,
	"group" varchar(1),
	"home_team" varchar(3),
	"away_team" varchar(3),
	"home_slot" text,
	"away_slot" text,
	"kickoff_utc" timestamp with time zone NOT NULL,
	"venue_key" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "teams" (
	"fifa_code" varchar(3) PRIMARY KEY NOT NULL,
	"display_name" text NOT NULL,
	"confederation" text NOT NULL,
	"group" varchar(1) NOT NULL,
	"draw_pot" smallint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "venues" (
	"key" text PRIMARY KEY NOT NULL,
	"stadium" text NOT NULL,
	"city" text NOT NULL,
	"country" varchar(3) NOT NULL
);
--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_home_team_teams_fifa_code_fk" FOREIGN KEY ("home_team") REFERENCES "public"."teams"("fifa_code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_away_team_teams_fifa_code_fk" FOREIGN KEY ("away_team") REFERENCES "public"."teams"("fifa_code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_venue_key_venues_key_fk" FOREIGN KEY ("venue_key") REFERENCES "public"."venues"("key") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_matches_round" ON "matches" USING btree ("round");--> statement-breakpoint
CREATE INDEX "idx_matches_group" ON "matches" USING btree ("group");--> statement-breakpoint
CREATE INDEX "idx_matches_kickoff" ON "matches" USING btree ("kickoff_utc");--> statement-breakpoint
CREATE INDEX "idx_teams_group" ON "teams" USING btree ("group");