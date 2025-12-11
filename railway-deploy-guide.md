# 🚂 Деплой на Railway с кастомным доменом

## Быстрая инструкция

### 1. Подготовка бэкенда для Railway

Railway лучше работает с GitHub репозиторием. Создайте структуру:

```
backend/
├── dist/
├── prisma/
├── package.json
├── .env.example
└── railway.json (опционально)
```

### 2. Создать railway.json

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "npm install && npm run build && npx prisma generate"
  },
  "deploy": {
    "startCommand": "node dist/app.js",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

### 3. Настроить переменные окружения в Railway

```
DATABASE_URL=file:./prisma/dev.db
JWT_SECRET=ваш-секретный-ключ
NODE_ENV=production
PORT=5001
```

### 4. Добавить кастомный домен

1. Settings → Networking → Custom Domain
2. Введите: `api.academy.dilmurodnurkhonov.uz`
3. Скопируйте DNS записи
4. Добавьте в панели управления доменом

### 5. Обновить фронтенд

```bash
cd frontend
echo "VITE_API_URL=https://api.academy.dilmurodnurkhonov.uz/api" > .env.production
npm run build:skip-check
```

---

**Готово! API будет работать на вашем домене! 🎉**
