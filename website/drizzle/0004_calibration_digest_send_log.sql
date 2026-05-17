ALTER TABLE "send_log" ALTER COLUMN "brief_date" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "send_log" ADD COLUMN "event_type" text DEFAULT 'brief' NOT NULL;--> statement-breakpoint
ALTER TABLE "send_log" ADD COLUMN "digest_date" date;--> statement-breakpoint
CREATE INDEX "idx_send_log_event_subscriber_digest" ON "send_log" USING btree ("event_type","subscriber_id","digest_date");