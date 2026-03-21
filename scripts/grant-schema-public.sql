-- Выполнить в Adminer/psql ПОД ПОЛЬЗОВАТЕЛЕМ С ПРАВАМИ ВЛАДЕЛЬЦА БД ИЛИ СУПЕРПОЛЬЗОВАТЕЛЕМ (НЕ gen_user, если у него нет прав).
-- После этого миграции можно гонять под gen_user или через drizzle-kit.

-- Подключение: к базе ansara_erp

GRANT USAGE, CREATE ON SCHEMA public TO gen_user;

-- Чтобы gen_user мог создавать объекты и в будущем (после новых миграций):
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL ON TABLES TO gen_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL ON SEQUENCES TO gen_user;

-- Если объекты уже созданы другим пользователем и нужно передать gen_user:
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO gen_user;
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO gen_user;
