ALTER TABLE "projects" DROP CONSTRAINT "projects_url_required";--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "qr_code_url" text;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "qr_code_pathname" text;--> statement-breakpoint
CREATE UNIQUE INDEX "projects_qr_code_pathname_unique" ON "projects" USING btree ("qr_code_pathname");--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_qr_code_complete" CHECK (num_nonnulls("projects"."qr_code_url", "projects"."qr_code_pathname") in (0, 2));--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_destination_required" CHECK ("projects"."status" = 'draft' or num_nonnulls("projects"."website_url", "projects"."github_url", "projects"."qr_code_url") >= 1);