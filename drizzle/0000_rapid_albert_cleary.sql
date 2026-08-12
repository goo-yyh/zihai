CREATE TYPE "public"."iteration_status" AS ENUM('draft', 'pending', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."project_status" AS ENUM('draft', 'pending', 'approved', 'rejected', 'archived');--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp with time zone,
	"refresh_token_expires_at" timestamp with time zone,
	"scope" text,
	"password" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	"impersonated_by" text,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"username" text,
	"display_username" text,
	"role" text DEFAULT 'user' NOT NULL,
	"banned" boolean DEFAULT false NOT NULL,
	"ban_reason" text,
	"ban_expires" timestamp with time zone,
	"onboarding_completed" boolean DEFAULT false NOT NULL,
	"avatar_pathname" text,
	CONSTRAINT "user_email_unique" UNIQUE("email"),
	CONSTRAINT "user_username_unique" UNIQUE("username")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "iteration_images" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"iteration_id" uuid NOT NULL,
	"blob_url" text NOT NULL,
	"blob_pathname" text NOT NULL,
	"mime_type" varchar(64) NOT NULL,
	"size_bytes" integer NOT NULL,
	"sort_order" smallint NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "iteration_images_size_positive" CHECK ("iteration_images"."size_bytes" > 0)
);
--> statement-breakpoint
CREATE TABLE "project_iterations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"owner_id" text NOT NULL,
	"version_label" varchar(80),
	"description" text NOT NULL,
	"status" "iteration_status" DEFAULT 'draft' NOT NULL,
	"rejection_reason" text,
	"submitted_at" timestamp with time zone,
	"approved_at" timestamp with time zone,
	"approved_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_likes" (
	"user_id" text NOT NULL,
	"project_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "project_likes_user_id_project_id_pk" PRIMARY KEY("user_id","project_id")
);
--> statement-breakpoint
CREATE TABLE "moderation_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"admin_id" text,
	"target_type" text NOT NULL,
	"target_id" text NOT NULL,
	"action" text NOT NULL,
	"reason" text,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_images" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"blob_url" text NOT NULL,
	"blob_pathname" text NOT NULL,
	"mime_type" varchar(64) NOT NULL,
	"size_bytes" integer NOT NULL,
	"sort_order" smallint NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "project_images_size_positive" CHECK ("project_images"."size_bytes" > 0)
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" text NOT NULL,
	"name" varchar(100) NOT NULL,
	"slug" varchar(140) NOT NULL,
	"description" text NOT NULL,
	"website_url" text,
	"github_url" text,
	"status" "project_status" DEFAULT 'draft' NOT NULL,
	"rejection_reason" text,
	"submitted_at" timestamp with time zone,
	"approved_at" timestamp with time zone,
	"approved_by" text,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "projects_url_xor" CHECK (num_nonnulls("projects"."website_url", "projects"."github_url") = 1)
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "iteration_images" ADD CONSTRAINT "iteration_images_iteration_id_project_iterations_id_fk" FOREIGN KEY ("iteration_id") REFERENCES "public"."project_iterations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_iterations" ADD CONSTRAINT "project_iterations_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_iterations" ADD CONSTRAINT "project_iterations_owner_id_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_iterations" ADD CONSTRAINT "project_iterations_approved_by_user_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_likes" ADD CONSTRAINT "project_likes_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_likes" ADD CONSTRAINT "project_likes_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "moderation_logs" ADD CONSTRAINT "moderation_logs_admin_id_user_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_images" ADD CONSTRAINT "project_images_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_owner_id_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_approved_by_user_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "account_user_id_idx" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "account_provider_account_unique" ON "account" USING btree ("provider_id","account_id");--> statement-breakpoint
CREATE INDEX "session_user_id_idx" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_created_at_idx" ON "user" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "user_role_idx" ON "user" USING btree ("role");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "verification" USING btree ("identifier");--> statement-breakpoint
CREATE INDEX "iteration_images_iteration_id_idx" ON "iteration_images" USING btree ("iteration_id");--> statement-breakpoint
CREATE UNIQUE INDEX "iteration_images_pathname_unique" ON "iteration_images" USING btree ("blob_pathname");--> statement-breakpoint
CREATE UNIQUE INDEX "iteration_images_sort_unique" ON "iteration_images" USING btree ("iteration_id","sort_order");--> statement-breakpoint
CREATE INDEX "project_iterations_project_id_idx" ON "project_iterations" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "project_iterations_owner_id_idx" ON "project_iterations" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "project_iterations_status_idx" ON "project_iterations" USING btree ("status");--> statement-breakpoint
CREATE INDEX "project_iterations_created_at_idx" ON "project_iterations" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "project_likes_project_id_idx" ON "project_likes" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "moderation_logs_admin_id_idx" ON "moderation_logs" USING btree ("admin_id");--> statement-breakpoint
CREATE INDEX "moderation_logs_target_idx" ON "moderation_logs" USING btree ("target_type","target_id");--> statement-breakpoint
CREATE INDEX "moderation_logs_created_at_idx" ON "moderation_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "project_images_project_id_idx" ON "project_images" USING btree ("project_id");--> statement-breakpoint
CREATE UNIQUE INDEX "project_images_pathname_unique" ON "project_images" USING btree ("blob_pathname");--> statement-breakpoint
CREATE UNIQUE INDEX "project_images_sort_unique" ON "project_images" USING btree ("project_id","sort_order");--> statement-breakpoint
CREATE UNIQUE INDEX "projects_slug_unique" ON "projects" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "projects_owner_id_idx" ON "projects" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "projects_status_idx" ON "projects" USING btree ("status");--> statement-breakpoint
CREATE INDEX "projects_created_at_idx" ON "projects" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "projects_published_at_idx" ON "projects" USING btree ("published_at");--> statement-breakpoint
ALTER TABLE "user" ADD CONSTRAINT "user_username_canonical" CHECK (
	"username" IS NULL OR (
		"username" = lower("username") AND
		"username" ~ '^[a-z0-9_-]{3,24}$'
	)
);--> statement-breakpoint
ALTER TABLE "user" ADD CONSTRAINT "user_role_allowed" CHECK ("role" IN ('user', 'admin'));--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_name_length" CHECK (char_length("name") BETWEEN 2 AND 100);--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_description_length" CHECK (char_length("description") BETWEEN 10 AND 4000);--> statement-breakpoint
ALTER TABLE "project_iterations" ADD CONSTRAINT "project_iterations_description_length" CHECK (char_length("description") BETWEEN 10 AND 4000);--> statement-breakpoint
ALTER TABLE "project_images" ADD CONSTRAINT "project_images_policy" CHECK (
	"mime_type" IN ('image/jpeg', 'image/png', 'image/webp') AND
	"size_bytes" <= 5242880 AND
	"sort_order" >= 0
);--> statement-breakpoint
ALTER TABLE "iteration_images" ADD CONSTRAINT "iteration_images_policy" CHECK (
	"mime_type" IN ('image/jpeg', 'image/png', 'image/webp') AND
	"size_bytes" <= 5242880 AND
	"sort_order" >= 0
);--> statement-breakpoint
CREATE OR REPLACE FUNCTION enforce_project_image_limit() RETURNS trigger AS $$
BEGIN
	PERFORM pg_advisory_xact_lock(hashtextextended(NEW.project_id::text, 0));
	IF (SELECT count(*) FROM project_images WHERE project_id = NEW.project_id) >= 3 THEN
		RAISE EXCEPTION 'A project can have at most 3 images' USING ERRCODE = 'check_violation';
	END IF;
	RETURN NEW;
END;
$$ LANGUAGE plpgsql;--> statement-breakpoint
CREATE TRIGGER project_images_limit_before_insert
	BEFORE INSERT ON "project_images"
	FOR EACH ROW EXECUTE FUNCTION enforce_project_image_limit();--> statement-breakpoint
CREATE OR REPLACE FUNCTION enforce_iteration_image_limit() RETURNS trigger AS $$
BEGIN
	PERFORM pg_advisory_xact_lock(hashtextextended(NEW.iteration_id::text, 1));
	IF (SELECT count(*) FROM iteration_images WHERE iteration_id = NEW.iteration_id) >= 3 THEN
		RAISE EXCEPTION 'An iteration can have at most 3 images' USING ERRCODE = 'check_violation';
	END IF;
	RETURN NEW;
END;
$$ LANGUAGE plpgsql;--> statement-breakpoint
CREATE TRIGGER iteration_images_limit_before_insert
	BEFORE INSERT ON "iteration_images"
	FOR EACH ROW EXECUTE FUNCTION enforce_iteration_image_limit();--> statement-breakpoint
CREATE OR REPLACE FUNCTION enforce_iteration_owner() RETURNS trigger AS $$
BEGIN
	IF NOT EXISTS (
		SELECT 1 FROM projects
		WHERE projects.id = NEW.project_id AND projects.owner_id = NEW.owner_id
	) THEN
		RAISE EXCEPTION 'Iteration owner must match project owner' USING ERRCODE = 'foreign_key_violation';
	END IF;
	RETURN NEW;
END;
$$ LANGUAGE plpgsql;--> statement-breakpoint
CREATE TRIGGER project_iterations_owner_before_write
	BEFORE INSERT OR UPDATE OF project_id, owner_id ON "project_iterations"
	FOR EACH ROW EXECUTE FUNCTION enforce_iteration_owner();
