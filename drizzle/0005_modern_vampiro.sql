CREATE INDEX "project_iterations_project_id_status_approved_at_created_at_idx" ON "project_iterations" USING btree ("project_id","status","approved_at","created_at");--> statement-breakpoint
CREATE INDEX "project_iterations_project_id_owner_id_created_at_idx" ON "project_iterations" USING btree ("project_id","owner_id","created_at");--> statement-breakpoint
CREATE INDEX "project_iterations_status_updated_at_id_idx" ON "project_iterations" USING btree ("status","updated_at","id");--> statement-breakpoint
CREATE INDEX "projects_status_published_at_id_idx" ON "projects" USING btree ("status","published_at","id");--> statement-breakpoint
CREATE INDEX "projects_owner_id_updated_at_idx" ON "projects" USING btree ("owner_id","updated_at");