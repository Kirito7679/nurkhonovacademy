# ✅ Переменные окружения Railway обновлены

## Что было сделано:

### 1. Установлены правильные переменные Supabase:

✅ **SUPABASE_URL**: `https://czmkyqkibxrryjpjfdsb.supabase.co`
✅ **SUPABASE_SERVICE_KEY**: service_role ключ установлен

### 2. Удалена неправильная переменная:

❌ **SUPABASE_ANON_KEY**: удалена (если была)

## Текущее состояние:

Теперь в Railway установлены только правильные переменные:
- `SUPABASE_URL` - URL проекта Supabase
- `SUPABASE_SERVICE_KEY` - service_role ключ для работы с Storage

## Что дальше:

1. **Railway автоматически перезапустит приложение** (1-2 минуты)
2. **Проверьте, что bucket 'avatars' создан** в Supabase Dashboard:
   - Storage → New bucket → `avatars` (public)
3. **Попробуйте загрузить фото профиля** - должно работать!

## Проверка:

После перезапуска приложения (через 1-2 минуты):

```bash
cd backend
npx @railway/cli logs
```

Ищите сообщения об успешной инициализации Supabase.

## ✅ Готово!

Переменные окружения настроены правильно. Теперь загрузка файлов должна работать без ошибок "signature verification failed".
