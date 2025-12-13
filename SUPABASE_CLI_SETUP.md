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
npm run supabase -- link --project-ref czmkyqkibxrryjpjfdsb
```
Связывает текущую директорию с вашим Supabase проектом.

### Управление Storage:

#### Просмотр bucket:
```bash
cd backend
npm run supabase -- storage list
```

#### Создание bucket:
```bash
cd backend
npm run supabase -- storage create avatars --public
npm run supabase -- storage create lessons --public
```

#### Загрузка файла:
```bash
cd backend
npm run supabase -- storage upload avatars ./path/to/file.jpg
```

#### Список файлов в bucket:
```bash
cd backend
npm run supabase -- storage list avatars
```

#### Удаление файла:
```bash
cd backend
npm run supabase -- storage remove avatars file.jpg
```

### Управление базой данных:

#### Просмотр таблиц:
```bash
cd backend
npm run supabase -- db list
```

#### Выполнение SQL:
```bash
cd backend
npm run supabase -- db execute "SELECT * FROM users LIMIT 10;"
```

### Полезные команды:

#### Статус проекта:
```bash
cd backend
npm run supabase -- status
```

#### Информация о проекте:
```bash
cd backend
npm run supabase -- projects list
```

#### Получение API ключей:
```bash
cd backend
npm run supabase -- projects api-keys --project-ref czmkyqkibxrryjpjfdsb
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
