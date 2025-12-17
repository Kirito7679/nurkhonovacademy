# 🔧 Исправление доступа к базе данных

## Проблема

Ошибка: `User 'user' was denied access on the database 'nurkhonov_academy.public'`

Все запросы к API возвращают 500 ошибку, так как Prisma не может подключиться к базе данных.

## Решение

### Вариант 1: Использовать Railway базу данных (рекомендуется)

1. Получите `DATABASE_URL` из Railway:
```bash
cd backend
npx @railway/cli variables | grep DATABASE_URL
```

2. Скопируйте значение `DATABASE_URL`

3. Обновите `backend/.env`:
```bash
DATABASE_URL="postgresql://user:password@host:port/database"
```

4. Перезапустите backend

5. Примените миграцию:
```bash
cd backend
npx prisma db push
```

### Вариант 2: Настроить локальную PostgreSQL

1. Убедитесь, что PostgreSQL запущен:
```bash
pg_isready
```

2. Подключитесь как суперпользователь:
```bash
psql -U postgres
```

3. Создайте базу данных и пользователя:
```sql
CREATE DATABASE nurkhonov_academy;
CREATE USER your_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE nurkhonov_academy TO your_user;
\c nurkhonov_academy
GRANT ALL ON SCHEMA public TO your_user;
```

4. Обновите `backend/.env`:
```bash
DATABASE_URL="postgresql://your_user:your_password@localhost:5432/nurkhonov_academy"
```

5. Примените миграцию:
```bash
cd backend
npx prisma db push
```

### Вариант 3: Временно использовать SQLite

Измените `backend/prisma/schema.prisma`:

```prisma
datasource db {
  provider = "sqlite"
  url      = "file:./dev.db"
}
```

Затем:
```bash
cd backend
npx prisma db push
npx prisma generate
```

**Примечание**: SQLite не поддерживает все функции PostgreSQL, но подойдет для быстрого тестирования.

## После исправления

1. Перезапустите backend
2. Проверьте подключение:
```bash
curl http://localhost:5001/api/health
```

3. Попробуйте войти в систему
4. Проверьте создание классов

## Проверка

После настройки БД все запросы должны работать:
- ✅ `/api/auth/login` - вход
- ✅ `/api/courses` - список курсов
- ✅ `/api/classes` - список классов
- ✅ `/api/students` - список студентов

---

**Рекомендация**: Используйте Railway БД для локальной разработки - она уже настроена и работает.




