-- Indexes aligned with dashboard and LK-editor query patterns

CREATE INDEX IF NOT EXISTS timeline_entries_project_date_sort_idx
  ON timeline_entries (project_id, entry_date DESC, sort_order ASC);

CREATE INDEX IF NOT EXISTS timeline_images_entry_sort_idx
  ON timeline_images (entry_id, sort_order ASC);

CREATE INDEX IF NOT EXISTS timeline_links_entry_sort_idx
  ON timeline_links (entry_id, sort_order ASC);

CREATE INDEX IF NOT EXISTS stages_project_sort_idx
  ON stages (project_id, sort_order ASC);

CREATE INDEX IF NOT EXISTS stage_tasks_stage_sort_idx
  ON stage_tasks (stage_id, sort_order ASC);

CREATE INDEX IF NOT EXISTS projects_status_dashboard_sort_idx
  ON projects (status, dashboard_sort_order ASC, updated_at DESC);

CREATE INDEX IF NOT EXISTS projects_group_id_idx
  ON projects (group_id);

CREATE INDEX IF NOT EXISTS payment_ledger_project_date_idx
  ON payment_ledger (project_id, payment_date DESC);

CREATE INDEX IF NOT EXISTS payment_text_blocks_project_sort_idx
  ON payment_text_blocks (project_id, sort_order ASC);

CREATE INDEX IF NOT EXISTS project_groups_sort_idx
  ON project_groups (sort_order ASC);
