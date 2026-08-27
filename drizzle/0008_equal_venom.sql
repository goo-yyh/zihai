CREATE TYPE "public"."notification_type" AS ENUM('project_liked', 'project_suggestion_received', 'project_suggestion_accepted', 'project_suggestion_rejected', 'project_suggestion_completed', 'project_approved', 'project_rejected', 'project_archived', 'project_republished');--> statement-breakpoint
CREATE TYPE "public"."project_suggestion_status" AS ENUM('pending', 'accepted', 'rejected', 'completed');--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"recipient_id" text NOT NULL,
	"actor_id" text,
	"type" "notification_type" NOT NULL,
	"project_id" uuid,
	"suggestion_id" uuid,
	"payload" jsonb NOT NULL,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_suggestions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"author_id" text NOT NULL,
	"content" text NOT NULL,
	"status" "project_suggestion_status" DEFAULT 'pending' NOT NULL,
	"rejection_reason" text,
	"responded_at" timestamp with time zone,
	"responded_by" text,
	"completed_at" timestamp with time zone,
	"completed_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "project_suggestions_content_length_check" CHECK (length(trim("project_suggestions"."content")) between 10 and 2000),
	CONSTRAINT "project_suggestions_state_details_check" CHECK ((
        ("project_suggestions"."status" = 'pending' and "project_suggestions"."responded_at" is null and "project_suggestions"."responded_by" is null and "project_suggestions"."rejection_reason" is null and "project_suggestions"."completed_at" is null and "project_suggestions"."completed_by" is null)
        or ("project_suggestions"."status" = 'accepted' and "project_suggestions"."responded_at" is not null and "project_suggestions"."rejection_reason" is null and "project_suggestions"."completed_at" is null and "project_suggestions"."completed_by" is null)
        or ("project_suggestions"."status" = 'rejected' and "project_suggestions"."responded_at" is not null and length(trim("project_suggestions"."rejection_reason")) between 3 and 2000 and "project_suggestions"."completed_at" is null and "project_suggestions"."completed_by" is null)
        or ("project_suggestions"."status" = 'completed' and "project_suggestions"."responded_at" is not null and "project_suggestions"."rejection_reason" is null and "project_suggestions"."completed_at" is not null)
      ))
);
--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_recipient_id_user_id_fk" FOREIGN KEY ("recipient_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_actor_id_user_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_suggestion_id_project_suggestions_id_fk" FOREIGN KEY ("suggestion_id") REFERENCES "public"."project_suggestions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_suggestions" ADD CONSTRAINT "project_suggestions_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_suggestions" ADD CONSTRAINT "project_suggestions_author_id_user_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_suggestions" ADD CONSTRAINT "project_suggestions_responded_by_user_id_fk" FOREIGN KEY ("responded_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_suggestions" ADD CONSTRAINT "project_suggestions_completed_by_user_id_fk" FOREIGN KEY ("completed_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "notifications_recipient_created_id_idx" ON "notifications" USING btree ("recipient_id","created_at" DESC NULLS LAST,"id" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "notifications_recipient_unread_created_id_idx" ON "notifications" USING btree ("recipient_id","created_at" DESC NULLS LAST,"id" DESC NULLS LAST) WHERE "notifications"."read_at" is null;--> statement-breakpoint
CREATE INDEX "project_suggestions_project_created_id_idx" ON "project_suggestions" USING btree ("project_id","created_at" DESC NULLS LAST,"id" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "project_suggestions_project_status_created_id_idx" ON "project_suggestions" USING btree ("project_id","status","created_at" DESC NULLS LAST,"id" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "project_suggestions_author_created_id_idx" ON "project_suggestions" USING btree ("author_id","created_at" DESC NULLS LAST,"id" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "project_suggestions_author_status_created_id_idx" ON "project_suggestions" USING btree ("author_id","status","created_at" DESC NULLS LAST,"id" DESC NULLS LAST);
--> statement-breakpoint
CREATE OR REPLACE FUNCTION enforce_project_suggestion_submission()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  project_owner_id text;
  current_project_status project_status;
BEGIN
  SELECT owner_id, status
    INTO project_owner_id, current_project_status
  FROM projects
  WHERE id = NEW.project_id
  FOR SHARE;

  IF NOT FOUND OR current_project_status <> 'approved' THEN
    RAISE EXCEPTION 'Suggestions require an approved project'
      USING ERRCODE = '23514',
            CONSTRAINT = 'project_suggestions_approved_project_check';
  END IF;

  IF project_owner_id = NEW.author_id THEN
    RAISE EXCEPTION 'Project owners cannot suggest changes to their own project'
      USING ERRCODE = '23514',
            CONSTRAINT = 'project_suggestions_not_owner_check';
  END IF;

  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER project_suggestions_submission_guard
BEFORE INSERT OR UPDATE OF project_id, author_id ON project_suggestions
FOR EACH ROW
EXECUTE FUNCTION enforce_project_suggestion_submission();
