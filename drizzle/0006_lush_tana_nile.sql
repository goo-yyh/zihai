CREATE TYPE "public"."idea_status" AS ENUM('pending', 'accepted', 'rejected', 'completed');--> statement-breakpoint
CREATE TABLE "ideas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"title" varchar(120) NOT NULL,
	"description" text NOT NULL,
	"status" "idea_status" DEFAULT 'pending' NOT NULL,
	"rejection_reason" text,
	"result_url" text,
	"github_url" text,
	"reviewed_at" timestamp with time zone,
	"reviewed_by" text,
	"completed_at" timestamp with time zone,
	"completed_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ideas_state_details_check" CHECK ((
        ("ideas"."status" = 'pending' and "ideas"."reviewed_at" is null and "ideas"."rejection_reason" is null and "ideas"."result_url" is null and "ideas"."github_url" is null and "ideas"."completed_at" is null)
        or ("ideas"."status" = 'accepted' and "ideas"."reviewed_at" is not null and "ideas"."rejection_reason" is null and "ideas"."result_url" is null and "ideas"."github_url" is null and "ideas"."completed_at" is null)
        or ("ideas"."status" = 'rejected' and "ideas"."reviewed_at" is not null and length(trim("ideas"."rejection_reason")) >= 3 and "ideas"."result_url" is null and "ideas"."github_url" is null and "ideas"."completed_at" is null)
        or ("ideas"."status" = 'completed' and "ideas"."reviewed_at" is not null and "ideas"."rejection_reason" is null and num_nonnulls("ideas"."result_url", "ideas"."github_url") >= 1 and "ideas"."completed_at" is not null)
      ))
);
--> statement-breakpoint
ALTER TABLE "ideas" ADD CONSTRAINT "ideas_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ideas" ADD CONSTRAINT "ideas_reviewed_by_user_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ideas" ADD CONSTRAINT "ideas_completed_by_user_id_fk" FOREIGN KEY ("completed_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ideas_user_id_updated_at_idx" ON "ideas" USING btree ("user_id","updated_at");--> statement-breakpoint
CREATE INDEX "ideas_status_updated_at_idx" ON "ideas" USING btree ("status","updated_at");