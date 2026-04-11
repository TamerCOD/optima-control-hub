# Деплой Optima Control HUB → Railway

## 1. Инициализация Git и push на GitHub

```bash
# В папке проекта (C:\Users\ishem\OneDrive\Desktop\claudi)
git init
git add .
git commit -m "Initial commit"

# Создай репозиторий на github.com, затем:
git remote add origin https://github.com/<твой-username>/<repo-name>.git
git branch -M main
git push -u origin main
```

## 2. Деплой на Railway

1. Открой [railway.app](https://railway.app) и войди через GitHub
2. Нажми **"New Project"** → **"Deploy from GitHub repo"**
3. Выбери репозиторий `<repo-name>`
4. Railway автоматически:
   - Обнаружит Node.js проект
   - Запустит `npm run build` (Vite сборка ~30с)
   - Запустит `npm start` (Express сервер)

## 3. Переменные окружения (опционально)

В Railway → Settings → Variables добавь при необходимости:
```
NODE_ENV=production
PORT=3000   ← Railway устанавливает сам, не обязательно
```

## 4. Домен

Railway → Settings → Networking → Generate Domain  
Получишь URL вида: `https://your-app.up.railway.app`

## 5. Проверка

После деплоя проверь:
- `https://your-app.up.railway.app/health` → должен вернуть JSON со status: "ok"
- `https://your-app.up.railway.app/` → должен открыться логин

---

## Структура деплоя

```
GitHub push → Railway клонирует репо
           → npm ci --include=dev    (устанавливает все зависимости)
           → npm run build           (Vite собирает dist/)
           → npm start               (Express отдаёт dist/ + API)
```

## Локальный запуск

```bash
npm install
npm run dev      # dev-сервер на localhost:3000
npm run build    # production сборка
npm start        # production сервер
```
