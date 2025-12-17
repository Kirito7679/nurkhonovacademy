# Инструкция по применению миграции

## Добавление поля createdBy в таблицу users

Для отслеживания, кто создал пользователя (студента или учителя), необходимо применить миграцию базы данных.

### Вариант 1: Через Prisma CLI (рекомендуется)

```bash
cd backend
npx prisma migrate dev --name add_created_by_to_user
```

### Вариант 2: Вручную через SQL

Если Prisma миграция не работает, выполните SQL команды напрямую в базе данных:

```sql
-- Add createdBy field to users table
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "createdBy" TEXT;

-- Add foreign key constraint
ALTER TABLE "users" ADD CONSTRAINT "users_createdBy_fkey" 
  FOREIGN KEY ("createdBy") REFERENCES "users"("id") 
  ON DELETE SET NULL ON UPDATE CASCADE;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS "users_createdBy_idx" ON "users"("createdBy");
```

### Вариант 3: Через Railway Dashboard

1. Откройте Railway Dashboard
2. Перейдите в вашу базу данных PostgreSQL
3. Откройте Query Editor
4. Выполните SQL команды из варианта 2

## После применения миграции

1. Перезапустите backend сервер
2. Проверьте, что все работает корректно

