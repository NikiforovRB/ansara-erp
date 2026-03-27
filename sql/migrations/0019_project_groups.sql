create table if not exists project_groups (
  id uuid primary key default gen_random_uuid(),
  title varchar(256) not null,
  sort_order integer not null default 0
);

alter table projects add column if not exists group_id uuid;

do $$
begin
  alter table projects
    add constraint projects_group_id_fkey
    foreign key (group_id) references project_groups(id)
    on delete set null;
exception when duplicate_object then null;
end $$;
