-- Если в логине в скобках видно code=42501 или «permission denied for table …»:
-- выполнить под владельцем БД (не под gen_user). Имя роли должно совпадать с POSTGRESQL_USER.

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO gen_user;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO gen_user;
