# EDMS - Enterprise Document Management System

Полнофункциональная система управления документами с workflow, подписями и интеграцией Supabase.

## 🚀 Быстрый старт

### 1. Установка и Инициализация

```bash
# Клонировать репозиторий
git clone <repo-url>
cd project

# Установить зависимости и выполнить полную настройку
npm run setup
```

### 2. Конфигурация Supabase

Создайте `.env` файл с учетными данными Supabase:

```env
# Supabase
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_PROJECT_ID=your-project-id
```

### 3. Применение Миграций

```bash
# Применить все миграции к БД
npm run migrate
```

### 4. Развертывание Edge Functions

```bash
# Развернуть все edge functions
npm run deploy:functions
```

### 5. Запуск Приложения

```bash
# Начало разработки
npm run dev

# Построение для production
npm run build

# Предпросмотр production сборки
npm run preview
```

## 📋 Доступные команды

| Команда | Описание |
|---------|---------|
| `npm run setup` | Полная инициализация приложения |
| `npm run setup:supabase` | Настройка Supabase и проверка |
| `npm run migrate` | Применение всех миграций БД |
| `npm run deploy:functions` | Развертывание edge functions |
| `npm run dev` | Запуск dev сервера |
| `npm run build` | Production build |
| `npm run lint` | Проверка кода |
| `npm run typecheck` | TypeScript проверка типов |

## 🔐 Учетные данные для тестирования

Автоматически создаются при первом запуске:

```
Email: admin@edms.demo
Password: Demo123456!
```

## 🏗️ Архитектура

### Frontend
- **React 18** + TypeScript
- **Vite** - быстрая сборка
- **Tailwind CSS** - стилизация
- **React Router** - навигация
- **React Query** - управление состоянием
- **React Hook Form** + Zod - валидация форм
- **i18next** - интернационализация (EN/RU)
- **Lucide React** - иконки

### Backend
- **Supabase PostgreSQL** - база данных
- **Supabase Auth** - аутентификация
- **Row Level Security (RLS)** - безопасность данных
- **Edge Functions** - серверные функции (Deno)
- **Real-time** - синхронизация в реальном времени

## 📁 Структура проекта

```
project/
├── src/
│   ├── app/                 # App shell и routing
│   ├── pages/              # Страницы приложения
│   ├── entities/           # Business logic entities
│   ├── features/           # Функциональные модули
│   ├── shared/             # Общие компоненты и утилиты
│   │   ├── api/            # API клиент (Supabase)
│   │   ├── ui/             # UI компоненты
│   │   ├── lib/            # Утилиты и helpers
│   │   └── hooks/          # Общие hooks
│   ├── widgets/            # Большие композитные компоненты
│   └── main.tsx
├── supabase/
│   ├── migrations/         # SQL миграции
│   │   ├── 001_core_schema.sql
│   │   ├── 002_documents_nomenclature.sql
│   │   ├── 003_workflow_engine.sql
│   │   ├── 004_templates_signatures.sql
│   │   └── 005_audit_notifications.sql
│   └── functions/          # Edge Functions
│       ├── workflow-engine/
│       ├── audit-service/
│       └── create-test-user/
├── scripts/                # Автоматизационные скрипты
│   ├── setup.sh           # Полная установка
│   ├── setup-supabase.sh  # Настройка Supabase
│   ├── migrate.sh         # Миграции БД
│   └── deploy-functions.sh # Развертывание функций
├── .env                    # Переменные окружения
├── vite.config.ts         # Конфиг Vite
├── tailwind.config.js     # Конфиг Tailwind
└── tsconfig.json          # TypeScript конфиг
```

## 🎯 Функциональность

### Документы
- ✅ CRUD операции
- ✅ Версионирование
- ✅ Регистрация документов
- ✅ Тегирование
- ✅ Полнотекстовый поиск
- ✅ Экспорт/Импорт

### Workflow
- ✅ Визуальный конструктор
- ✅ Drag-and-drop узлы
- ✅ Условные переходы
- ✅ Параллельное выполнение
- ✅ Таймеры и уведомления
- ✅ История событий

### Управление задачами
- ✅ Согласование документов
- ✅ Подписание
- ✅ Делегирование задач
- ✅ SLA и напоминания
- ✅ Комментарии и аннотации

### Безопасность
- ✅ Row Level Security (RLS)
- ✅ Аутентификация Supabase
- ✅ Журнал аудита
- ✅ Цифровые подписи
- ✅ Шифрование данных

### Локализация
- ✅ Английский (EN)
- ✅ Русский (RU)
- ✅ Автоопределение языка
- ✅ Переводы всех страниц

## 🔄 Database Migrations

### 001 - Core Schema
Основные таблицы: пользователи, организации, роли.

### 002 - Documents & Nomenclature
Документы, типы, номенклатура, теги.

### 003 - Workflow Engine
Workflow, узлы, задачи, события.

### 004 - Templates & Signatures
Шаблоны документов, подписи, версии.

### 005 - Audit & Notifications
Журнал аудита, уведомления, комментарии.

## 🚀 Edge Functions

### workflow-engine
Основной движок выполнения workflow:
- Запуск workflow
- Создание задач
- Выполнение условной логики
- События и уведомления

**Endpoints:**
- `POST /start` - запуск workflow
- `POST /task/complete` - выполнение задачи
- `GET /status/{runId}` - статус run

### audit-service
Неизменяемый журнал аудита:
- Логирование действий
- Запрос журналов
- Статистика
- Экспорт

**Endpoints:**
- `POST /log` - создать запись аудита
- `GET /query` - запросить логи
- `GET /stats` - статистика
- `GET /export` - экспорт

## 📊 Типы данных

### Document
```typescript
{
  id: string;
  title: string;
  description: string | null;
  content: string | null;
  status: DocumentStatus;
  registration_number: string | null;
  version_label: string;
  is_confidential: boolean;
  created_at: string;
  updated_at: string;
}
```

### Workflow
```typescript
{
  id: string;
  name: string;
  code: string;
  definition: WorkflowDefinition;
  is_published: boolean;
  is_active: boolean;
  status: WorkflowStatus;
  created_at: string;
}
```

### WorkflowTask
```typescript
{
  id: string;
  workflow_run_id: string;
  assignee_id: string;
  status: TaskStatus;
  due_date: string | null;
  outcome: string | null;
  completed_at: string | null;
}
```

## 🔒 Row Level Security

Все таблицы защищены RLS политиками:

```sql
-- Пример RLS политики
CREATE POLICY "Users can view own documents"
  ON documents FOR SELECT
  TO authenticated
  USING (
    organization_id = (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );
```

## 🧪 Тестирование

```bash
# Запуск тестового сценария
# 1. Логин с demo учетом
# 2. Создание документа
# 3. Запуск workflow
# 4. Согласование документа
# 5. Подписание

Email: admin@edms.demo
Password: Demo123456!
```

## 📱 Интернационализация

Приложение поддерживает несколько языков:

- **English (EN)** - по умолчанию
- **Русский (RU)** - полный перевод

Языковые файлы: `src/shared/lib/i18n/locales/`

## 🔧 Конфигурация

### Environment Variables

```bash
# Supabase
VITE_SUPABASE_URL=https://project.supabase.co
VITE_SUPABASE_ANON_KEY=key
SUPABASE_SERVICE_ROLE_KEY=key
SUPABASE_PROJECT_ID=project-id
```

### Tailwind CSS

Конфигурация: `tailwind.config.js`

### TypeScript

Конфигурация: `tsconfig.json`

## 📈 Performance

- ✅ Optimistic UI updates
- ✅ Request caching (React Query)
- ✅ Code splitting
- ✅ Image optimization
- ✅ Lazy loading

## 🐛 Troubleshooting

### Ошибка подключения к Supabase
```bash
# Проверьте .env файл
cat .env | grep SUPABASE

# Проверьте credentials в Supabase Dashboard
```

### Edge Functions не развернулись
```bash
# Проверьте Project ID
echo $SUPABASE_PROJECT_ID

# Установите Supabase CLI
npm install -g supabase

# Попробуйте развернуть вручную
supabase functions deploy workflow-engine
```

### Миграции не применяются
```bash
# Проверьте статус миграций
supabase migration list

# Примените вручную
supabase migration up
```

## 📝 Лицензия

MIT

## 👥 Команда разработки

EDMS - Enterprise Document Management System

---

**Версия:** 1.0.0  
**Последнее обновление:** 2026-06-02
