CREATE TABLE "send_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"subscriber_id" uuid NOT NULL,
	"brief_date" date NOT NULL,
	"message_id" text,
	"status" text NOT NULL,
	"sent_at" timestamp with time zone DEFAULT now() NOT NULL,
	"delivered_at" timestamp with time zone,
	"opened_at" timestamp with time zone,
	"clicked_at" timestamp with time zone,
	"bounced_at" timestamp with time zone,
	"complained_at" timestamp with time zone,
	"meta" jsonb DEFAULT '{}'::jsonb
);
--> statement-breakpoint
CREATE TABLE "subscribers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"status" text NOT NULL,
	"verification_token" text,
	"verification_sent_at" timestamp with time zone,
	"verified_at" timestamp with time zone,
	"subscribed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"unsubscribed_at" timestamp with time zone,
	"source" text,
	"locale" text DEFAULT 'en',
	"preferences" jsonb DEFAULT '{}'::jsonb,
	"consent_text" text NOT NULL,
	"consent_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "subscribers_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "suppression_list" (
	"email" text PRIMARY KEY NOT NULL,
	"reason" text NOT NULL,
	"added_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "unsubscribe_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"subscriber_id" uuid,
	"email" text NOT NULL,
	"reason" text,
	"feedback_text" text,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "send_log" ADD CONSTRAINT "send_log_subscriber_id_subscribers_id_fk" FOREIGN KEY ("subscriber_id") REFERENCES "public"."subscribers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "unsubscribe_log" ADD CONSTRAINT "unsubscribe_log_subscriber_id_subscribers_id_fk" FOREIGN KEY ("subscriber_id") REFERENCES "public"."subscribers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_send_log_subscriber" ON "send_log" USING btree ("subscriber_id");--> statement-breakpoint
CREATE INDEX "idx_send_log_brief_date" ON "send_log" USING btree ("brief_date");--> statement-breakpoint
CREATE INDEX "idx_subscribers_status" ON "subscribers" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_subscribers_verification_token" ON "subscribers" USING btree ("verification_token");