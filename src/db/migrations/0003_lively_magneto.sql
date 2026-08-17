CREATE TYPE "public"."log_level" AS ENUM('debug', 'info', 'warn', 'error');--> statement-breakpoint
DROP INDEX "logs_service_timestamp_idx";--> statement-breakpoint
DROP INDEX "logs_level_timestamp_idx";--> statement-breakpoint
ALTER TABLE "logs" ALTER COLUMN "level" SET DATA TYPE "public"."log_level" USING "level"::"public"."log_level";--> statement-breakpoint
ALTER TABLE "logs" ALTER COLUMN "service" SET DATA TYPE text;--> statement-breakpoint
CREATE INDEX "logs_timestamp_id_idx" ON "logs" USING btree ("timestamp","id");--> statement-breakpoint
ALTER TABLE "logs" DROP COLUMN "created_at";