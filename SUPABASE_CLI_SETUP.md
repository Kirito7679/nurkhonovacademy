# 🔧 Supabase CLI - Установка и использование

## ✅ Установка завершена!

Supabase CLI успешно установлен локально в проект.

## 📋 Основные команды:

**Важно**: Все команды нужно запускать из директории `backend/` используя `npx supabase`

### Авторизация:
```bash
cd backend
npx supabase login
```
Войдите в свой Supabase аккаунт через браузер.

### Связывание с проектом:
```bash
cd backend
npx supabase link --project-ref czmkyqkibxrryjpjfdsb
```
Связывает текущую директорию с вашим Supabase проектом.

### Управление Storage:

#### Просмотр bucket:
```bash
cd backend
npx supabase storage ls
```

#### Создание bucket (через Dashboard):
⚠️ **Важно**: Bucket создаются через Supabase Dashboard, а не через CLI.

1. Откройте Supabase Dashboard → Storage
2. Нажмите "New bucket"
3. Создайте `avatars` (публичный, 5MB)
4. Создайте `lessons` (публичный, 100MB)

#### Загрузка файла:
```bash
cd backend
npx supabase storage cp ./path/to/file.jpg avatars/file.jpg
```

#### Список файлов в bucket:
```bash
cd backend
npx supabase storage ls avatars
```

#### Удаление файла:
```bash
cd backend
npx supabase storage rm avatars/file.jpg
```

### Управление базой данных:

#### Просмотр таблиц:
```bash
cd backend
npx supabase db list
```

#### Выполнение SQL:
```bash
cd backend
npx supabase db execute "SELECT * FROM users LIMIT 10;"
```

### Полезные команды:

#### Статус проекта:
```bash
cd backend
npx supabase status
```

#### Информация о проекте:
```bash
cd backend
npx supabase projects list
```

#### Получение API ключей:
```bash
cd backend
npx supabase projects api-keys --project-ref czmkyqkibxrryjpjfdsb
```

## 🔗 Ваш проект:

- **Project Ref**: `czmkyqkibxrryjpjfdsb`
- **URL**: `https://czmkyqkibxrryjpjfdsb.supabase.co`

## 📝 Следующие шаги:

1. **Авторизуйтесь:**
   ```bash
   cd backend
   npx supabase login
   ```

2. **Свяжите проект (опционально):**
   ```bash
   cd backend
   npx supabase link --project-ref czmkyqkibxrryjpjfdsb
   ```

3. **Проверьте Storage bucket:**
   ```bash
   cd backend
   npx supabase storage list
   ```

## 💡 Альтернатива: Установка через Homebrew (глобально)

Если хотите установить глобально (требуются права администратора):

```bash
brew install supabase/tap/supabase
```

После этого можно использовать `supabase` напрямую без `npm run`.

## ✅ Готово!

Теперь вы можете управлять Supabase через командную строку!

