#!/bin/bash
set -Eeuo pipefail

LOG_DIR="logs"
mkdir -p "$LOG_DIR"
LOG_FILE="$LOG_DIR/healthcheck_$(date +%Y%m%d_%H%M%S).log"
exec > >(tee -a "$LOG_FILE") 2>&1

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

source .env 2>/dev/null || { echo "Ошибка: .env не найден"; exit 1; }

all_ok=true

echo "Проверка Supabase API..."
if curl -s -f -H "apikey: $VITE_SUPABASE_ANON_KEY" "$VITE_SUPABASE_URL/rest/v1/" >/dev/null; then
    echo -e "${GREEN}✓ API доступно${NC}"
else
    echo -e "${RED}✗ API недоступно${NC}"; all_ok=false
fi

echo "Проверка таблиц..."
for table in profiles organizations documents workflows; do
    if curl -s -f -H "apikey: $VITE_SUPABASE_ANON_KEY" "$VITE_SUPABASE_URL/rest/v1/$table?limit=1" >/dev/null; then
        echo -e "${GREEN}✓ Таблица $table существует${NC}"
    else
        echo -e "${RED}✗ Таблица $table не найдена${NC}"; all_ok=false
    fi
done

echo "Проверка edge-функций..."
for func in workflow-engine audit-service create-test-user; do
    status=$(curl -s -o /dev/null -w "%{http_code}" -H "Authorization: Bearer $VITE_SUPABASE_ANON_KEY" "$VITE_SUPABASE_URL/functions/v1/$func")
    if [ "$status" = "404" ]; then
        echo -e "${RED}✗ Функция $func не найдена (404)${NC}"; all_ok=false
    else
        echo -e "${GREEN}✓ Функция $func доступна (HTTP $status)${NC}"
    fi
done

if $all_ok; then
    echo -e "\n${GREEN}Healthcheck пройден${NC}"
    exit 0
else
    echo -e "\n${RED}Healthcheck не пройден${NC}"
    exit 1
fi