alter table project_deadlines
  add column if not exists calendar_plan_original_key text,
  add column if not exists calendar_plan_webp_key text;
