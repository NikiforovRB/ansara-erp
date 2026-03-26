do $$
begin
  alter type payment_text_color add value if not exists 'load';
exception when duplicate_object then null;
end $$;
