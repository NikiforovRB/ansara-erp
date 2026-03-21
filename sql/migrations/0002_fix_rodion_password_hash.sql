-- Исправление bcrypt-хеша для rodion, если при вставке в Adminer исказились символы
-- (I/1/l, G/c и т.п.). Пароль соответствует изначально заданному при создании записи.
-- Выполнить в ansara_erp под пользователем с правом UPDATE на users.

UPDATE users
SET password_hash = '$2b$10$PQMw90kALlc/j87pNKbUsu5IqX/eKREs8C0SXZsIWMl8djFYuJQXG'
WHERE login = 'rodion';
