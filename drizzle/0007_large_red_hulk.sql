DROP TABLE "iteration_images";--> statement-breakpoint
DROP TABLE "project_iterations";--> statement-breakpoint
DROP FUNCTION IF EXISTS enforce_iteration_image_limit();--> statement-breakpoint
DROP FUNCTION IF EXISTS enforce_iteration_owner();--> statement-breakpoint
DROP TYPE "public"."iteration_status";
