do $$
begin
  alter type payment_text_color add value if not exists 'red';
exception when duplicate_object then null;
end $$;
