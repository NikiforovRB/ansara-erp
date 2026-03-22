DO $$
BEGIN
  CREATE TYPE backlog_list_status AS ENUM (
    'not_started',
    'in_progress',
    'completed',
    'rejected'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE backlog_lists
  ADD COLUMN IF NOT EXISTS list_status backlog_list_status NOT NULL DEFAULT 'not_started';

ALTER TABLE backlog_lists
  ADD COLUMN IF NOT EXISTS formed_at date;

UPDATE backlog_lists SET formed_at = CURRENT_DATE WHERE formed_at IS NULL;

ALTER TABLE backlog_lists
  ALTER COLUMN formed_at SET DEFAULT CURRENT_DATE;

ALTER TABLE backlog_lists
  ALTER COLUMN formed_at SET NOT NULL;
