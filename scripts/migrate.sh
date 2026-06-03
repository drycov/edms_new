#!/bin/sh

# Database Migration Script
# Applies all migrations to Supabase

set -e

echo "=========================================="
echo "Applying Database Migrations"
echo "=========================================="
echo ""

# Check environment
if [ -z "$SUPABASE_PROJECT_ID" ]; then
    echo "Error: SUPABASE_PROJECT_ID not set"
    exit 1
fi

# List migrations
echo "Migrations found:"
ls -1 supabase/migrations/*.sql | while read migration; do
    echo "  ✓ $(basename $migration)"
done
echo ""

# Apply migrations
echo "Applying migrations..."
npx supabase migration up --project-id "$SUPABASE_PROJECT_ID"
echo "✓ All migrations applied"
echo ""

echo "=========================================="
echo "Database setup complete!"
echo "=========================================="
echo ""
