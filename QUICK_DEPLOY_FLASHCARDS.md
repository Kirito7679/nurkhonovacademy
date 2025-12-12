# ⚡ Быстрый деплой исправлений Flashcards и Integrations

## 🎯 Проблема
Endpoints `/api/flashcards` и `/api/integrations` возвращают 404 ошибку на production.

## ✅ Решение
Исправлены связи в Prisma схеме и обновлен контроллер. Теперь нужно задеплоить изменения.

## 🚀 Команды для деплоя

Выполните эти команды по порядку:

```bash
# 1. Перейдите в папку проекта
cd "/Users/macplus/Desktop/Projects/Nurkhonov Academy"

# 2. Добавьте измененные и новые файлы
git add backend/prisma/schema.prisma
git add backend/src/controllers/flashcardController.ts
git add backend/src/routes/flashcardRoutes.ts
git add backend/src/routes/integrationRoutes.ts
git add backend/src/controllers/integrationController.ts

# 3. Закоммитьте изменения
git commit -m "fix: Add FlashcardProgress relation and fix flashcards/integrations routes

- Added FlashcardProgress relation to Flashcard model
- Fixed getFlashcardsToReview query
- Routes are now properly configured"

# 4. Отправьте на GitHub
git push origin main
```

## ⏱️ Что произойдет дальше

1. **GitHub получит изменения** (1-2 секунды)
2. **Railway обнаружит новый коммит** (10-30 секунд)
3. **Railway запустит сборку:**
   - `npm install` - установка зависимостей
   - `npm run build` - компиляция TypeScript
   - `npx prisma generate` - генерация Prisma Client
   - `npx prisma db push` - применение изменений схемы к БД
4. **Railway перезапустит сервер** (10-30 секунд)

**Общее время:** 2-5 минут

## 🔍 Проверка после деплоя

После деплоя проверьте в браузере:

1. Откройте DevTools (F12)
2. Перейдите на страницу с flashcards или integrations
3. В Network tab не должно быть 404 ошибок для:
   - `api.academy.dilmurodnurkhonov.uz/api/flashcards`
   - `api.academy.dilmurodnurkhonov.uz/api/integrations`

## 📊 Мониторинг деплоя

Проверить статус деплоя можно в:
- **Railway Dashboard:** https://railway.app → Ваш проект → Deployments
- **GitHub:** Ваш репозиторий → Actions (если настроены)

## ⚠️ Если что-то пошло не так

1. **Проверьте логи Railway:**
   - Откройте Railway Dashboard
   - Выберите ваш проект
   - Откройте вкладку "Logs"
   - Ищите ошибки

2. **Проверьте, что файлы закоммичены:**
   ```bash
   git log --oneline -1
   # Должен показать ваш последний коммит
   ```

3. **Проверьте Railway переменные окружения:**
   - Убедитесь, что `DATABASE_URL` настроен правильно

---

**Готово!** Выполните команды выше, и через несколько минут endpoints будут работать. 🎉
