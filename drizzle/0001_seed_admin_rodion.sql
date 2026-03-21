-- Миграция: первый пользователь-администратор (логин rodion).
-- Пароль задан при создании; в БД хранится только bcrypt-хеш.
-- Повторный запрос безопасен: при совпадении логина обновит хеш, имя, фамилию и роль.

INSERT INTO users (login, password_hash, first_name, last_name, role)
VALUES (
  'rodion',
  '$2b$10$PQMw90kALlc/j87pNKbUsu5IqX/eKREs8C0SXZsIWMl8djFYuJQXG',
  'Родион',
  'Администратор',
  'admin'
)
ON CONFLICT (login) DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  first_name = EXCLUDED.first_name,
  last_name = EXCLUDED.last_name,
  role = EXCLUDED.role;
