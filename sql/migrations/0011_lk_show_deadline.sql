alter table projects
  add column if not exists lk_show_deadline boolean not null default true;
