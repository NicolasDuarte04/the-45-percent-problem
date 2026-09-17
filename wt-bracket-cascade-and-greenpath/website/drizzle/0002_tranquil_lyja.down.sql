-- Rollback for 0002_tranquil_lyja.sql.
-- Hand-written; drizzle-kit does not emit down migrations.
--
-- WARNING: this drops the predictions table outright. Safe in Phase A while
-- no production predictions exist. Once predictions exist in production,
-- rollback becomes a manual data-export operation; see README ops runbook
-- before invoking.

DROP INDEX IF EXISTS "idx_predictions_submitted_at";
DROP INDEX IF EXISTS "idx_predictions_state";
DROP INDEX IF EXISTS "idx_predictions_email_lower";
DROP INDEX IF EXISTS "idx_predictions_subscriber_id";

DROP TABLE IF EXISTS "predictions";

ALTER TABLE "subscribers" DROP COLUMN IF EXISTS "subscription_types";
