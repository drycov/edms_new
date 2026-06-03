# EDMS Quick Start Guide

## 🚀 Быстрый старт за 5 минут

### 1. Клонирование и установка

```bash
# Установите зависимости
npm install

# Настройте Supabase (создайте .env с вашими credentials)
nano .env
```

### 2. Полная инициализация

```bash
# Одной командой установит все
npm run setup
```

Эта команда:
- ✅ Установит зависимости
- ✅ Проверит окружение
- ✅ Применит миграции БД
- ✅ Развернет edge functions
- ✅ Выведет финальные инструкции

### 3. Запуск приложения

```bash
# Запустите dev сервер
npm run dev

# Откройте в браузере
# http://localhost:5173
```

### 4. Логин

```
Email: admin@edms.demo
Password: Demo123456!
```

## 📋 Пошаговая установка

Если не хотите использовать `npm run setup`:

### Step 1: Установить зависимости

```bash
npm install --legacy-peer-deps
```

### Step 2: Настроить .env

```bash
cp .env.example .env
# Отредактируйте .env с вашими Supabase credentials
```

Содержимое `.env`:
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_PROJECT_ID=your-project-id
```

### Step 3: Применить миграции

```bash
npm run migrate
```

Или вручную в Supabase Dashboard:
1. Откройте SQL Editor
2. Скопируйте SQL из файлов в `supabase/migrations/`
3. Выполните в порядке нумерации

### Step 4: Развернуть Edge Functions

```bash
npm run deploy:functions
```

Или вручную:
```bash
npx supabase functions deploy workflow-engine
npx supabase functions deploy audit-service
npx supabase functions deploy create-test-user
```

### Step 5: Запустить приложение

```bash
npm run dev
```

## 🔧 Troubleshooting

### ❌ "SUPABASE_URL is not set"

**Решение:** Создайте .env файл в корне проекта

```bash
cat > .env << EOF
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-key
SUPABASE_SERVICE_ROLE_KEY=your-key
SUPABASE_PROJECT_ID=your-id
EOF
```

### ❌ "Port 5173 already in use"

**Решение:** Используйте другой порт

```bash
npm run dev -- --port 3000
```

### ❌ "TypeScript errors"

**Решение:** Очистите кэш и переустановите

```bash
rm -rf node_modules
npm install
npm run typecheck
```

### ❌ "Edge functions deployment failed"

**Решение:** Проверьте Project ID

```bash
# Выведет все проекты
supabase projects list

# Установите Project ID
export SUPABASE_PROJECT_ID=your-id
npm run deploy:functions
```

## 📚 Основные команды

```bash
# Разработка
npm run dev          # Запуск dev сервера
npm run build        # Production build
npm run preview      # Превью production build

# Качество кода
npm run lint         # ESLint проверка
npm run typecheck    # TypeScript проверка

# Supabase
npm run migrate      # Применить миграции
npm run deploy:functions  # Развернуть functions

# Полная установка
npm run setup        # Полная инициализация
npm run setup:supabase # Только Supabase
```

## 🎯 Что дальше?

1. **Создайте первый документ**
   - Перейдите на страницу Documents
   - Нажмите "New Document"
   - Заполните форму

2. **Создайте workflow**
   - Перейдите на Workflows
   - Нажмите "New Workflow"
   - Добавьте узлы через drag-and-drop

3. **Запустите workflow**
   - Создайте документ
   - Отправьте его в workflow
   - Согласуйте на странице Approvals

4. **Проверьте журнал аудита**
   - Перейдите на Audit Log
   - Посмотрите историю всех действий

## 🔐 Безопасность

- ✅ Все данные зашифрованы в transit (HTTPS)
- ✅ Row Level Security (RLS) защищает данные
- ✅ API endpoints требуют JWT токен
- ✅ Edge functions используют service role key

## 📞 Поддержка

Если возникли вопросы:

1. Проверьте логи: `npm run dev` (консоль браузера)
2. Проверьте Supabase Dashboard
3. Прочитайте документацию: `/SETUP.md`

## 🚀 Production Deploy

```bash
# Build для production
npm run build

# Файлы готовы в папке dist/
# Разверните на хостинг:
# - Vercel
# - Netlify
# - AWS S3 + CloudFront
# - Heroku
```

---

**Нужна помощь?** Посетите [Supabase docs](https://supabase.com/docs)
