-- Пользователь alexey, роль администратор. Хеш bcrypt для пароля samolet456 (60 символов, копировать целиком).
INSERT INTO users (login, password_hash, first_name, last_name, role)
VALUES (
  'alexey',
  '$2b$10$GmiWvOx7Gk8nHu0wcEN9OepIrm.p5y1Owm81RfzyUB/hrKI0O0XP.',
  'Алексей',
  'Сотрудник',
  'admin'
)
ON CONFLICT (login) DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  first_name = EXCLUDED.first_name,
  last_name = EXCLUDED.last_name,
  role = EXCLUDED.role;
