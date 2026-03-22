ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS lk_show_backlog boolean NOT NULL DEFAULT false;
