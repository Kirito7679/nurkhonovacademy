# ⚡ Быстрый деплой Этапа 2

## 🚀 За 3 шага

### Шаг 1: Подготовка (на вашем компьютере)

```bash
cd "/Users/macplus/Desktop/Projects/Nurkhonov Academy"
./prepare-deploy-phase2.sh
```

Или вручную:
```bash
cd frontend
npm install
echo "VITE_API_URL=https://api.academy.dilmurodnurkhonov.uz/api" > .env.production
npm run build
```

**Готовые файлы:** `frontend/dist/` и `frontend/.htaccess`

---

### Шаг 2: Обновление Backend (Railway)

```bash
# Закоммитьте и запушьте изменения
git add .
git commit -m "Phase 2: Replace dialogs, improve typing"
git push origin main
```

Railway автоматически обновит backend.

---

### Шаг 3: Обновление Frontend (cPanel)

1. Войдите в **cPanel → File Manager**
2. Перейдите в **`public_html/academy`** (или ваша директория)
3. **Удалите старые файлы** (кроме `.htaccess`)
4. **Загрузите новые файлы:**
   - Всё содержимое из `frontend/dist/`
   - Файл `frontend/.htaccess` (если его нет)

---

## ✅ Проверка

1. Откройте: `https://academy.dilmurodnurkhonov.uz`
2. Проверьте консоль браузера (F12) - нет ошибок
3. Проверьте API: `https://api.academy.dilmurodnurkhonov.uz/api/health`

---

## 📦 Что загружать

### На cPanel:
- ✅ `frontend/dist/index.html`
- ✅ `frontend/dist/assets/` (вся папка)
- ✅ `frontend/.htaccess`

### На Railway:
- ✅ Автоматически через GitHub push

---

**Готово! 🎉**

Подробная инструкция: `DEPLOY_UPDATE_PHASE2.md`

