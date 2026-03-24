do $$
begin
  alter type payment_text_color add value if not exists 'neutral';
exception when duplicate_object then null;
end $$;

alter table projects
  add column if not exists lk_show_payments boolean not null default true;
