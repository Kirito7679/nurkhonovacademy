# ☁️ Настройка Supabase Storage (Альтернатива Cloudinary)

## ✅ Почему Supabase:

- ✅ **Доступен в Узбекистане**
- ✅ **1 GB бесплатно** (достаточно для начала)
- ✅ **2 GB трафика/месяц**
- ✅ Универсальный (любые файлы)
- ✅ Встроенный CDN
- ✅ Простая интеграция
- ✅ Не требует кредитной карты

## 📋 Шаг 1: Регистрация на Supabase

1. Перейдите на [https://supabase.com](https://supabase.com)
2. Нажмите "Start your project"
3. Войдите через GitHub (рекомендуется) или создайте аккаунт
4. **Не требуется кредитная карта!**

## 🏗️ Шаг 2: Создание проекта

1. Нажмите "New Project"
2. Заполните:
   - **Name**: `nurkhonov-academy` (или любое другое)
   - **Database Password**: создайте надежный пароль (сохраните его!)
   - **Region**: выберите ближайший регион
3. Нажмите "Create new project"
4. Подождите 2-3 минуты (создание проекта)

## 🔑 Шаг 3: Получение API ключей

1. После создания проекта откройте **Settings** (шестеренка внизу слева)
2. Перейдите в **API**
3. Скопируйте:
   - **Project URL** (например: `https://xyz.supabase.co`)
   - **anon public key** (длинный ключ, начинается с `eyJ...`)
   - **service_role key** (секретный ключ, начинается с `eyJ...`)

## 📦 Шаг 4: Создание Storage Bucket

1. В левом меню откройте **Storage**
2. Нажмите "New bucket"
3. Создайте два bucket:

   **Bucket 1: `avatars`**
   - Name: `avatars`
   - Public: ✅ (чтобы файлы были доступны по URL)
   - File size limit: 5 MB
   - Allowed MIME types: `image/jpeg,image/png,image/gif,image/webp`

   **Bucket 2: `lessons`**
   - Name: `lessons`
   - Public: ✅
   - File size limit: 50 MB
   - Allowed MIME types: (оставьте пустым для всех типов)

## ⚙️ Шаг 5: Настройка политик доступа

1. Для каждого bucket откройте **Policies**
2. Нажмите "New Policy"
3. Выберите "For full customization"
4. Добавьте политику:

**Для `avatars`:**
```sql
-- Allow public read access
CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');

-- Allow authenticated users to upload
CREATE POLICY "Authenticated Upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.role() = 'authenticated');

-- Allow users to update their own files
CREATE POLICY "User Update" ON storage.objects FOR UPDATE USING (bucket_id = 'avatars' AND auth.role() = 'authenticated');

-- Allow users to delete their own files
CREATE POLICY "User Delete" ON storage.objects FOR DELETE USING (bucket_id = 'avatars' AND auth.role() = 'authenticated');
```

**Для `lessons`:**
```sql
-- Allow public read access
CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'lessons');

-- Allow authenticated users to upload
CREATE POLICY "Authenticated Upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'lessons' AND auth.role() = 'authenticated');
```

## 🔧 Шаг 6: Добавление в Railway

Добавьте в Railway Variables:

```
SUPABASE_URL=ваш_project_url
SUPABASE_ANON_KEY=ваш_anon_key
SUPABASE_SERVICE_KEY=ваш_service_role_key
```

## 📝 Шаг 7: Установка пакета

```bash
cd backend
npm install @supabase/supabase-js
```

## ✅ Готово!

После настройки все файлы будут сохраняться в Supabase Storage.

---

**Примечание**: Supabase Storage использует другой подход, чем Cloudinary. Нужно будет обновить код для работы с Supabase API.

