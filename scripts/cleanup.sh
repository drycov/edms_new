#!/bin/bash
# Очистка окружения EDMS

set -Eeuo pipefail

LOG_DIR="logs"
mkdir -p "$LOG_DIR"
LOG_FILE="$LOG_DIR/cleanup_$(date +%Y%m%d_%H%M%S).log"
exec > >(tee -a "$LOG_FILE") 2>&1

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "=========================================="
echo "EDMS Environment Cleanup"
echo "=========================================="

if [ "${1:-}" != "--force" ]; then
    echo -e "${YELLOW}ВНИМАНИЕ: Это действие удалит все данные, таблицы, миграции и edge-функции.${NC}"
    read -p "Введите 'YES' для подтверждения: " response
    if [ "$response" != "YES" ]; then echo "Отменено."; exit 0; fi
fi

require supabase

# Загрузка .env
if [ ! -f ".env" ]; then
    echo -e "${RED}Ошибка: .env файл не найден${NC}"
    exit 1
fi
set -a
source .env
set +a
: "${SUPABASE_PROJECT_ID:?Переменная SUPABASE_PROJECT_ID не задана}"

# Удаление edge-функций
echo -e "\n${YELLOW}Удаление edge-функций...${NC}"
for func in workflow-engine audit-service create-test-user; do
    echo "Удаление $func..."
    supabase functions delete "$func" --project-id "$SUPABASE_PROJECT_ID" 2>/dev/null || true
    echo -e "${GREEN}✓ $func удалена (если существовала)${NC}"
done

# Сброс БД
echo -e "\n${YELLOW}Сброс базы данных...${NC}"
supabase db reset --project-id "$SUPABASE_PROJECT_ID" --force || echo "Команда db reset не поддерживается, выполняем ручную очистку"
if [ -n "${SUPABASE_SERVICE_ROLE_KEY:-}" ]; then
    curl -X POST "${VITE_SUPABASE_URL}/rest/v1/rpc/exec_sql" \
        -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
        -H "Content-Type: application/json" \
        -d '{"query": "DO $$ DECLARE r RECORD; BEGIN FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = '\''public'\'') LOOP EXECUTE '\''DROP TABLE IF EXISTS '\'' || quote_ident(r.tablename) || '\'' CASCADE;'\''; END LOOP; END $$;"}'
    echo -e "${GREEN}✓ Таблицы удалены${NC}"
else
    echo -e "${YELLOW}Не задан SUPABASE_SERVICE_ROLE_KEY – пропускаем удаление таблиц${NC}"
fi

echo -e "\n=========================================="
echo -e "${GREEN}Очистка окружения завершена${NC}"
echo "Лог: $LOG_FILE"