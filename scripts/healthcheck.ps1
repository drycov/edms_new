#!/usr/bin/env pwsh
# Healthcheck для EDMS после деплоя

$ErrorActionPreference = 'Continue'
$logDir = "logs"
if (-not (Test-Path $logDir)) { New-Item -ItemType Directory -Path $logDir -Force | Out-Null }
$logFile = Join-Path $logDir "healthcheck_$(Get-Date -Format 'yyyyMMdd_HHmmss').log"
Start-Transcript -Path $logFile -Append

Write-Host "Проверка здоровья EDMS..."

# Загрузка .env
$envFile = ".env"
if (Test-Path $envFile) {
    Get-Content $envFile | ForEach-Object {
        if ($_ -match '^\s*([^#][^=]+)=(.*)$') {
            [Environment]::SetEnvironmentVariable($matches[1], $matches[2], 'Process')
        }
    }
}
$supabaseUrl = [Environment]::GetEnvironmentVariable("VITE_SUPABASE_URL")
$anonKey = [Environment]::GetEnvironmentVariable("VITE_SUPABASE_ANON_KEY")
$projectId = [Environment]::GetEnvironmentVariable("SUPABASE_PROJECT_ID")

$allOk = $true

# 1. Проверка доступности Supabase API
Write-Host "`n1. Проверка Supabase API..."
try {
    $response = Invoke-RestMethod -Uri "${supabaseUrl}/rest/v1/" -Headers @{ apikey = $anonKey } -Method Get
    Write-Host "${Green}✓ API доступно${NC}"
} catch {
    Write-Host "${Red}✗ API недоступно: $_${NC}"
    $allOk = $false
}

# 2. Проверка наличия обязательных таблиц
Write-Host "`n2. Проверка таблиц..."
$tables = @("profiles", "organizations", "documents", "workflows")
foreach ($table in $tables) {
    try {
        $uri = "${supabaseUrl}/rest/v1/${table}?limit=1"
        Invoke-RestMethod -Uri $uri -Headers @{ apikey = $anonKey } -Method Get | Out-Null
        Write-Host "${Green}✓ Таблица $table существует${NC}"
    } catch {
        Write-Host "${Red}✗ Таблица $table не найдена${NC}"
        $allOk = $false
    }
}

# 3. Проверка edge-функций (вызов test-функции, если доступна)
Write-Host "`n3. Проверка edge-функций..."
$functions = @("workflow-engine", "audit-service", "create-test-user")
foreach ($func in $functions) {
    $funcUrl = "${supabaseUrl}/functions/v1/${func}"
    try {
        $resp = Invoke-RestMethod -Uri $funcUrl -Headers @{ Authorization = "Bearer $anonKey" } -Method Get -ErrorAction SilentlyContinue
        # Если функция не требует авторизации – получим ответ, иначе 401/403 – тоже нормально (функция существует)
        Write-Host "${Green}✓ Функция $func доступна${NC}"
    } catch {
        if ($_.Exception.Response.StatusCode -in 401,403,404) {
            if ($_.Exception.Response.StatusCode -eq 404) {
                Write-Host "${Red}✗ Функция $func не найдена (404)${NC}"
                $allOk = $false
            } else {
                Write-Host "${Yellow}⚠ Функция $func требует аутентификации (${$_.Exception.Response.StatusCode}) – но она существует${NC}"
            }
        } else {
            Write-Host "${Red}✗ Ошибка при вызове $func : $_${NC}"
            $allOk = $false
        }
    }
}

# 4. Проверка WebSocket (real-time)
Write-Host "`n4. Проверка real-time (websocket)..." -NoNewline
$wsUrl = $supabaseUrl -replace '^https', 'wss'
# Упрощённая проверка – просто пингуем
try {
    $ping = Invoke-RestMethod -Uri "${supabaseUrl}/realtime/ping" -ErrorAction SilentlyContinue
    Write-Host "${Green}✓ Real-time доступен${NC}"
} catch {
    Write-Host "${Yellow}⚠ Не удалось проверить real-time (возможно, не включён)${NC}"
}

Write-Host "`n=========================================="
if ($allOk) {
    Write-Host "${Green}Healthcheck пройден успешно!${NC}"
    exit 0
} else {
    Write-Host "${Red}Healthcheck обнаружил проблемы.${NC}"
    exit 1
}
Stop-Transcript