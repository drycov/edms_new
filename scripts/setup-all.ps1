#!/usr/bin/env pwsh
# EDMS Production Setup Script (CLOUD ONLY v5)

param(
    [switch]$SkipBuild,
    [switch]$SkipMigrations,
    [switch]$SkipFunctions,
    [switch]$SkipTestUser,
    [switch]$ForceInstall
)

$ErrorActionPreference = "Stop"

# =========================
# UI
# =========================
$ESC = [char]27
$Green = "${ESC}[32m"
$Yellow = "${ESC}[33m"
$Red = "${ESC}[31m"
$NC = "${ESC}[0m"

function Info($m) { Write-Host "${Yellow}$m${NC}" }
function Ok($m) { Write-Host "${Green}$m${NC}" }
function Fail($m) { Write-Host "${Red}$m${NC}"; exit 1 }

Write-Host "=========================================="
Write-Host "EDMS Production Setup (CLOUD ONLY v5)"
Write-Host "=========================================="

# =========================
# REQUIREMENTS (STRICT CLOUD MODE)
# =========================
function Require($cmd) {
    if (-not (Get-Command $cmd -ErrorAction SilentlyContinue)) {
        Fail "Missing required command: $cmd"
    }
}

Require node
Require npm
Require supabase

$node = (node -v).Trim()
Ok "Node: $node"

if ($node -match "v([0-9]+)") {
    $major = [int]$matches[1]
    if ($major -gt 22 -and -not $ForceInstall) {
        Fail "Use LTS Node 20/22 only"
    }
}

# =========================
# ENV (STRICT)
# =========================
if (-not (Test-Path ".env")) {
    Fail ".env not found"
}

Get-Content ".env" | ForEach-Object {
    if ($_ -match '^\s*([^#][^=]+)=(.*)$') {
        [Environment]::SetEnvironmentVariable($matches[1], $matches[2], 'Process')
    }
}

$requiredEnv = @(
    "VITE_SUPABASE_URL",
    "VITE_SUPABASE_ANON_KEY",
    "SUPABASE_PROJECT_ID",
    "SUPABASE_SERVICE_ROLE_KEY"
)

foreach ($v in $requiredEnv) {
    if (-not [Environment]::GetEnvironmentVariable($v)) {
        Fail "Missing env var: $v"
    }
}

Ok "Environment loaded"

# =========================
# CLEAN NODE MODULES
# =========================
Info "Cleaning node_modules..."

if (Test-Path "node_modules") {
    Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
    npx rimraf node_modules
}

Ok "Clean OK"

# =========================
# INSTALL
# =========================
Info "Installing dependencies..."

if (Test-Path "package-lock.json") {
    & npm ci --no-audit --no-fund
} else {
    & npm install --no-audit --no-fund
}

if ($LASTEXITCODE -ne 0) {
    Fail "Dependency installation failed"
}

Ok "Dependencies installed"

# =========================
# BUILD
# =========================
if (-not $SkipBuild) {

    Info "Building frontend..."

    & npm run build

    if ($LASTEXITCODE -ne 0) {
        Fail "Build failed"
    }

    if (-not (Test-Path "dist")) {
        Fail "Missing dist output"
    }

    Ok "Build OK"
}

# =========================
# CLOUD LINK (NO LOCAL EVER)
# =========================
Info "Linking Supabase CLOUD project..."

$projectId = [Environment]::GetEnvironmentVariable("SUPABASE_PROJECT_ID")

& supabase link --project-ref $projectId

if ($LASTEXITCODE -ne 0) {
    Fail "Supabase link failed (check access rights / token)"
}

Ok "Cloud project linked"

# =========================
# MIGRATIONS (CLOUD ONLY)
# =========================
if (-not $SkipMigrations) {

    Info "Applying CLOUD migrations..."

    & supabase db push

    if ($LASTEXITCODE -ne 0) {
        Fail "Cloud migrations failed"
    }

    Ok "Migrations applied"
}

# =========================
# FUNCTIONS (CLOUD ONLY)
# =========================
if (-not $SkipFunctions) {

    Info "Deploying Edge Functions (CLOUD)..."

    $functions = @(
        "workflow-engine",
        "audit-service",
        "create-test-user"
    )

    foreach ($f in $functions) {

        Info "Deploy $f..."

        & supabase functions deploy $f

        if ($LASTEXITCODE -ne 0) {
            Fail "Function deploy failed: $f"
        }
    }

    Ok "Functions deployed"
}

# =========================
# TEST USER
# =========================
if (-not $SkipTestUser) {

    $serviceKey = [Environment]::GetEnvironmentVariable("SUPABASE_SERVICE_ROLE_KEY")

    if ($serviceKey) {

        $answer = Read-Host "Create test user? (y/n)"

        if ($answer -eq "y") {

            $url = [Environment]::GetEnvironmentVariable("VITE_SUPABASE_URL")

            $body = @{
                email = "admin@edms.demo"
                password = "Demo123456!"
                full_name = "Admin User"
                organization_name = "Demo Org"
            } | ConvertTo-Json

            try {
                Invoke-RestMethod `
                    -Uri "$url/functions/v1/create-test-user" `
                    -Method POST `
                    -Headers @{
                        Authorization = "Bearer $serviceKey"
                        "Content-Type" = "application/json"
                    } `
                    -Body $body

                Ok "Test user created"
            }
            catch {
                Fail "Test user creation failed: $_"
            }
        }
    }
    else {
        Info "Service role key missing → skipping test user"
    }
}

# =========================
# DONE
# =========================
Ok "CLOUD setup completed successfully"
Write-Host "=========================================="