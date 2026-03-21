-- Если alexey уже был создан со старой миграцией (employee), поднимаем роль до администратора.
UPDATE users SET role = 'admin' WHERE login = 'alexey';
