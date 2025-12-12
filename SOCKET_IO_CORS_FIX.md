# 🔧 Исправление CORS для Socket.IO

## 🔍 Проблема:

Socket.IO пытается подключиться к `http://localhost:5001` вместо production API URL, что вызывает CORS ошибки:
```
Access to XMLHttpRequest at 'http://localhost:5001/socket.io/...' from origin 'https://academy.dilmurodnurkhonov.uz' has been blocked by CORS policy
```

## ✅ Решение:

### 1. Frontend (`frontend/src/hooks/useSocket.ts`):

- Заменен хардкод `const SOCKET_URL = 'http://localhost:5001'`
- Добавлена функция `getSocketUrl()`, которая:
  - Использует `VITE_API_URL` из переменных окружения
  - Удаляет `/api` суффикс (Socket.IO не использует его)
  - Автоматически определяет production URL если не localhost

### 2. Backend (`backend/src/services/socketService.ts`):

- Обновлена CORS конфигурация для Socket.IO
- Добавлены production домены:
  - `https://academy.dilmurodnurkhonov.uz`
  - `https://www.academy.dilmurodnurkhonov.uz`
- Используется функция проверки origin для гибкости

### 3. Profile Page (`frontend/src/pages/Profile.tsx`):

- Исправлен URL для аватаров - теперь использует production URL вместо localhost

## 📝 Изменения:

### Frontend:
```typescript
// Было:
const SOCKET_URL = 'http://localhost:5001';

// Стало:
const getSocketUrl = (): string => {
  const envApiUrl = import.meta.env.VITE_API_URL;
  const apiBaseUrl = envApiUrl || 'http://localhost:5001/api';
  const baseUrl = apiBaseUrl.replace(/\/api$/, '');
  
  if (baseUrl.includes('localhost') && window.location.hostname !== 'localhost') {
    return 'https://api.academy.dilmurodnurkhonov.uz';
  }
  
  return baseUrl;
};
```

### Backend:
```typescript
// Было:
cors: {
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  methods: ['GET', 'POST'],
}

// Стало:
cors: {
  origin: (origin, callback) => {
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:5173',
      'https://academy.dilmurodnurkhonov.uz',
      'https://www.academy.dilmurodnurkhonov.uz',
    ];
    // ... проверка origin
  },
  credentials: true,
}
```

## ✅ Статус:

- ✅ Frontend обновлен
- ✅ Backend обновлен
- ✅ Изменения закоммичены
- ⏳ Нужно пересобрать frontend и загрузить на cPanel

## 📋 Следующие шаги:

1. **Пересоберите frontend:**
   ```bash
   cd frontend
   npm run build
   ```

2. **Загрузите новый build на cPanel:**
   - Загрузите содержимое `frontend/dist/` на сервер
   - Убедитесь, что `.htaccess` файл на месте

3. **Проверьте в браузере:**
   - Очистите кэш: Ctrl+Shift+R или Cmd+Shift+R
   - Проверьте, что Socket.IO подключается без CORS ошибок

---

**Примечание:** После пересборки frontend Socket.IO будет использовать правильный production URL автоматически.
