# Nurkhonov Academy Platform

Онлайн образовательная платформа для преподавания английского языка.

## Технологии

- **Backend**: Node.js + Express + TypeScript + Prisma + PostgreSQL
- **Frontend**: React + TypeScript + Vite + Tailwind CSS

## Установка

### Backend

```bash
cd backend
npm install
cp .env.example .env
# Настройте DATABASE_URL в .env
npx prisma generate
npx prisma migrate dev
npm run dev
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

## Структура проекта

- `backend/` - Backend приложение
- `frontend/` - Frontend приложение

## Роли пользователей

- **STUDENT** - студент, может просматривать курсы и уроки после получения доступа
- **TEACHER** - учитель, может создавать курсы, управлять студентами
- **ADMIN** - администратор, имеет те же права что и учитель

