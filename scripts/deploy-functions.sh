#!/bin/sh

# Deploy Edge Functions Script
# Deploys all edge functions to Supabase

set -e

echo "=========================================="
echo "Deploying Edge Functions"
echo "=========================================="
echo ""

# Check environment
if [ -z "$SUPABASE_PROJECT_ID" ]; then
    echo "Error: SUPABASE_PROJECT_ID not set"
    exit 1
fi

# List functions to deploy
FUNCTIONS=(
    "workflow-engine"
    "audit-service"
    "create-test-user"
)

echo "Edge functions to deploy:"
for func in "${FUNCTIONS[@]}"; do
    echo "  ✓ $func"
done
echo ""

# Deploy each function
for func in "${FUNCTIONS[@]}"; do
    echo "Deploying $func..."
    npx supabase functions deploy "$func" --project-id "$SUPABASE_PROJECT_ID"
    echo "✓ $func deployed"
    echo ""
done

echo "=========================================="
echo "All edge functions deployed!"
echo "=========================================="
echo ""
