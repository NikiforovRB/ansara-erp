ALTER TABLE timeline_entries ADD COLUMN IF NOT EXISTS description text NOT NULL DEFAULT '';
ALTER TABLE projects ADD COLUMN IF NOT EXISTS lk_stages_comment text;
