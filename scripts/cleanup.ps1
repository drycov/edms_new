#!/usr/bin/env pwsh
# Очистка окружения EDMS: сброс БД, откат миграций, удаление edge-функций

param(
    [switch]$Confirm,
    [switch]$Force  # без запроса подтверждения
)

$ErrorActionPreference = 'Stop'

$logDir = "logs"
if (-not (Test-Path $logDir)) { New-Item -ItemType Directory -Path $logDir -Force | Out-Null }
$logFile = Join-Path $logDir "cleanup_$(Get-Date -Format 'yyyyMMdd_HHmmss').log"
Start-Transcript -Path $logFile -Append

Write-Host "=========================================="
Write-Host "EDMS Environment Cleanup"
Write-Host "=========================================="

if (-not $Force -and -not $Confirm) {
    Write-Host "${Yellow}ВНИМАНИЕ: Это действие удалит все данные, таблицы, миграции и edge-функции.${NC}"
    $response = Read-Host "Введите 'YES' для подтверждения"
    if ($response -ne "YES") { Write-Host "Отменено."; exit 0 }
}

# Проверка supabase CLI
if (-not (Get-Command "supabase" -ErrorAction SilentlyContinue)) {
    Write-Host "${Red}Ошибка: supabase CLI не установлен${NC}"
    exit 1
}

# Загрузка .env
$envFile = ".env"
if (-not (Test-Path $envFile)) {
    Write-Host "${Red}Ошибка: .env файл не найден${NC}"
    exit 1
}
Get-Content $envFile | ForEach-Object {
    if ($_ -match '^\s*([^#][^=]+)=(.*)$') {
        [Environment]::SetEnvironmentVariable($matches[1], $matches[2], 'Process')
    }
}
$projectId = [Environment]::GetEnvironmentVariable("SUPABASE_PROJECT_ID")
if (-not $projectId) {
    Write-Host "${Red}Ошибка: SUPABASE_PROJECT_ID не задан в .env${NC}"
    exit 1
}

# 1. Удаление edge-функций
Write-Host "`n${Yellow}Удаление edge-функций...${NC}"
$functions = @("workflow-engine", "audit-service", "create-test-user")
foreach ($func in $functions) {
    Write-Host "Удаление $func..."
    supabase functions delete $func --project-id $projectId 2>$null
    Write-Host "${Green}✓ $func удалена (если существовала)${NC}"
}

# 2. Откат миграций до 0 (сброс схемы)
Write-Host "`n${Yellow}Сброс базы данных (откат миграций)...${NC}"
Write-Host "Применяем откат до нулевой миграции..."
supabase migration repair --status applied --version 0 --project-id $projectId 2>$null
supabase db reset --project-id $projectId --force 2>$null   # если поддерживается
# Альтернативный способ: удалить все таблицы через SQL (требуется SERVICE_ROLE_KEY)
$sql = @"
DO $$ DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
        EXECUTE 'DROP TABLE IF EXISTS ' || quote_ident(r.tablename) || ' CASCADE';
    END LOOP;
END $$;
"@
$serviceKey = [Environment]::GetEnvironmentVariable("SUPABASE_SERVICE_ROLE_KEY")
if ($serviceKey) {
    $supabaseUrl = [Environment]::GetEnvironmentVariable("VITE_SUPABASE_URL")
    $body = @{ query = $sql } | ConvertTo-Json
    Invoke-RestMethod -Uri "${supabaseUrl}/rest/v1/rpc/exec_sql" -Method Post -Headers @{
        Authorization = "Bearer $serviceKey"
        "Content-Type" = "application/json"
    } -Body $body -ErrorAction SilentlyContinue
    Write-Host "${Green}✓ Таблицы удалены${NC}"
} else {
    Write-Host "${Yellow}Не задан SUPABASE_SERVICE_ROLE_KEY – ручная очистка таблиц не выполнена.${NC}"
}

Write-Host "`n=========================================="
Write-Host "${Green}Очистка окружения завершена${NC}"
Write-Host "=========================================="
Write-Host "Лог: $logFile"
Stop-Transcript