#!/bin/sh

set -Eeuo pipefail

echo "=========================================="
echo "EDMS Setup"
echo "=========================================="

require() {
    command -v "$1" >/dev/null 2>&1 || {
        echo "Error: $1 is required"
        exit 1
    }
}

require node
require npm

echo "Node: $(node -v)"
echo "NPM : $(npm -v)"

if [ ! -f ".env" ]; then
    echo "Error: .env not found"
    exit 1
fi

set -a
source .env
set +a

required_vars=(
  VITE_SUPABASE_URL
  VITE_SUPABASE_ANON_KEY
)

for var in "${required_vars[@]}"; do
    if [ -z "${!var:-}" ]; then
        echo "Missing variable: $var"
        exit 1
    fi
done

echo "Installing dependencies..."
npm ci

echo "Building..."
npm run build

if [ ! -d "dist" ]; then
    echo "Build failed"
    exit 1
fi

echo
echo "=========================================="
echo "Build successful"
echo "=========================================="
echo
echo "Development:"
echo "  npm run dev"
echo
echo "Production preview:"
echo "  npm run preview"
echo