CREATE OR REPLACE FUNCTION enforce_project_image_limit() RETURNS trigger AS $$
BEGIN
	PERFORM pg_advisory_xact_lock(hashtextextended(NEW.project_id::text, 0));
	IF (SELECT count(*) FROM project_images WHERE project_id = NEW.project_id) >= 5 THEN
		RAISE EXCEPTION 'A project can have at most 5 images' USING ERRCODE = 'check_violation';
	END IF;
	RETURN NEW;
END;
$$ LANGUAGE plpgsql;--> statement-breakpoint
CREATE OR REPLACE FUNCTION enforce_iteration_image_limit() RETURNS trigger AS $$
BEGIN
	PERFORM pg_advisory_xact_lock(hashtextextended(NEW.iteration_id::text, 1));
	IF (SELECT count(*) FROM iteration_images WHERE iteration_id = NEW.iteration_id) >= 5 THEN
		RAISE EXCEPTION 'An iteration can have at most 5 images' USING ERRCODE = 'check_violation';
	END IF;
	RETURN NEW;
END;
$$ LANGUAGE plpgsql;
