# 🐘 Переход на PostgreSQL на Railway

## ⚠️ Проблема

SQLite файлы не сохраняются между деплоями на Railway. При каждом деплое создается новая пустая база данных.

**Решение:** Использовать PostgreSQL вместо SQLite.

---

## ✅ Пошаговая инструкция

### Шаг 1: Добавить PostgreSQL в Railway

1. Откройте проект в Railway: https://railway.app
2. В вашем проекте нажмите **"New"**
3. Выберите **"Database"** → **"Add PostgreSQL"**
4. Railway создаст PostgreSQL базу данных
5. **Скопируйте `DATABASE_URL`** - он будет показан автоматически

### Шаг 2: Обновить schema.prisma

Измените `datasource` в `backend/prisma/schema.prisma`:

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

### Шаг 3: Обновить переменную DATABASE_URL в Railway

1. В Railway откройте ваш проект
2. Перейдите в **Variables**
3. Найдите `DATABASE_URL`
4. Замените значение на PostgreSQL URL (который вы скопировали в Шаге 1)
5. Сохраните

### Шаг 4: Применить миграции

```bash
cd "/Users/macplus/Desktop/Projects/Nurkhonov Academy/backend"
npx @railway/cli run npx prisma migrate deploy
```

### Шаг 5: Создать пользователя

```bash
npx @railway/cli run npx tsx scripts/createUser.ts "Dilmurod" "Nurkhonov" "+998900350151" "Nurkhonov7769" "ADMIN"
```

---

## 📝 Альтернатива: Использовать Railway Volume для SQLite

Если хотите остаться на SQLite:

1. В Railway добавьте **Volume**
2. Измените `DATABASE_URL` на путь к Volume:
   ```
   DATABASE_URL=file:/data/dev.db
   ```
3. Обновите `railway.json` для монтирования Volume

Но **PostgreSQL надежнее** для production!

---

**Рекомендую перейти на PostgreSQL! 🚀**
