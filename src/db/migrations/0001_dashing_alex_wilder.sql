CREATE INDEX "logs_timestamp_idx" ON "logs" USING btree ("timestamp");--> statement-breakpoint
CREATE INDEX "logs_service_idx" ON "logs" USING btree ("service");--> statement-breakpoint
CREATE INDEX "logs_level_idx" ON "logs" USING btree ("level");