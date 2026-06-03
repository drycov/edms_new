#!/bin/bash
# EDMS Complete Setup Script (Bash) с логированием и healthcheck

set -Eeuo pipefail

# Парсинг аргументов
SKIP_BUILD=false
SKIP_MIGRATIONS=false
SKIP_FUNCTIONS=false
SKIP_TEST_USER=false

while [[ $# -gt 0 ]]; do
    case "$1" in
        --skip-build) SKIP_BUILD=true ;;
        --skip-migrations) SKIP_MIGRATIONS=true ;;
        --skip-functions) SKIP_FUNCTIONS=true ;;
        --skip-test-user) SKIP_TEST_USER=true ;;
        *) echo "Неизвестный аргумент: $1"; exit 1 ;;
    esac
    shift
done

# Цвета
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Логирование
LOG_DIR="logs"
mkdir -p "$LOG_DIR"
LOG_FILE="$LOG_DIR/setup_$(date +%Y%m%d_%H%M%S).log"

# Функция для вывода в консоль и лог
log() {
    local level="$1"
    shift
    local msg="$*"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo -e "$msg" | tee -a "$LOG_FILE"
}
exec > >(tee -a "$LOG_FILE") 2>&1

echo "=========================================="
echo "EDMS Complete Setup (Bash)"
echo "=========================================="

require() {
    command -v "$1" >/dev/null 2>&1 || {
        echo -e "${RED}Ошибка: $1 не установлен${NC}"
        exit 1
    }
}

require node
require npm
if [[ "$SKIP_MIGRATIONS" == false ]] || [[ "$SKIP_FUNCTIONS" == false ]]; then
    require supabase
fi

echo -e "${GREEN}✓ Node: $(node -v)${NC}"
echo -e "${GREEN}✓ NPM: $(npm -v)${NC}"
if command -v supabase >/dev/null 2>&1; then
    echo -e "${GREEN}✓ Supabase CLI: $(supabase --version)${NC}"
fi

# Загрузка .env
if [ ! -f ".env" ]; then
    echo -e "${RED}Ошибка: .env файл не найден${NC}"
    exit 1
fi
set -a
source .env
set +a

required_vars=(
    VITE_SUPABASE_URL
    VITE_SUPABASE_ANON_KEY
    SUPABASE_PROJECT_ID
)
for var in "${required_vars[@]}"; do
    if [ -z "${!var:-}" ]; then
        echo -e "${RED}Ошибка: переменная $var не задана в .env${NC}"
        exit 1
    fi
done
echo -e "${GREEN}✓ Переменные окружения загружены${NC}"

# Установка зависимостей
echo -e "\n${YELLOW}Установка зависимостей...${NC}"
npm ci

# Сборка
if [ "$SKIP_BUILD" = false ]; then
    echo -e "\n${YELLOW}Сборка проекта...${NC}"
    npm run build
    if [ ! -d "dist" ]; then
        echo -e "${RED}Ошибка сборки${NC}"
        exit 1
    fi
    echo -e "${GREEN}✓ Сборка успешна${NC}"
else
    echo -e "\n${YELLOW}Сборка пропущена (--skip-build)${NC}"
fi

# Миграции
if [ "$SKIP_MIGRATIONS" = false ]; then
    echo -e "\n=========================================="
    echo "Применение миграций базы данных"
    echo "=========================================="
    if [ ! -d "supabase/migrations" ]; then
        echo -e "${RED}Ошибка: директория supabase/migrations не найдена${NC}"
        exit 1
    fi
    echo "Найденные миграции:"
    ls -1 supabase/migrations/*.sql 2>/dev/null | while read m; do
        echo "  ✓ $(basename "$m")"
    done
    supabase migration up --project-id "$SUPABASE_PROJECT_ID"
    echo -e "${GREEN}✓ Миграции применены${NC}"
else
    echo -e "\n${YELLOW}Миграции пропущены (--skip-migrations)${NC}"
fi

# Деплой функций
if [ "$SKIP_FUNCTIONS" = false ]; then
    echo -e "\n=========================================="
    echo "Деплой Edge Functions"
    echo "=========================================="
    FUNCTIONS=("workflow-engine" "audit-service" "create-test-user")
    echo "Функции для деплоя:"
    for func in "${FUNCTIONS[@]}"; do
        echo "  ✓ $func"
    done
    for func in "${FUNCTIONS[@]}"; do
        echo "Деплой $func..."
        supabase functions deploy "$func" --project-id "$SUPABASE_PROJECT_ID"
        echo -e "${GREEN}✓ $func развёрнут${NC}"
    done
else
    echo -e "\n${YELLOW}Деплой функций пропущен (--skip-functions)${NC}"
fi

# Тестовый пользователь
if [ "$SKIP_TEST_USER" = false ]; then
    echo -e "\n=========================================="
    echo "Создание тестового пользователя"
    echo "=========================================="
    if [ -z "${SUPABASE_SERVICE_ROLE_KEY:-}" ]; then
        echo -e "${YELLOW}SUPABASE_SERVICE_ROLE_KEY не задан. Пропускаем.${NC}"
    else
        read -p "Создать тестового пользователя? (y/n): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            curl -X POST \
                "${VITE_SUPABASE_URL}/functions/v1/create-test-user" \
                -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
                -H "Content-Type: application/json" \
                -d '{"email":"admin@edms.demo","password":"Demo123456!","full_name":"Admin User","organization_name":"Demo Organization"}'
            echo -e "\n${GREEN}✓ Тестовый пользователь создан${NC}"
        fi
    fi
else
    echo -e "\n${YELLOW}Создание тестового пользователя пропущено (--skip-test-user)${NC}"
fi

# Healthcheck
echo -e "\n=========================================="
echo "Проверка здоровья (Healthcheck)"
echo "=========================================="
"$(dirname "$0")/healthcheck.sh"

echo -e "\n=========================================="
echo -e "${GREEN}Настройка EDMS завершена!${NC}"
echo "=========================================="
echo -e "\nЛог сохранён: $LOG_FILE"