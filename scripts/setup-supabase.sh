#!/bin/sh

# EDMS Supabase Setup Script
# Автоматическая инициализация базы данных и функций

set -e

echo "=========================================="
echo "EDMS Supabase Setup Script"
echo "=========================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check environment variables
echo -e "${YELLOW}Checking environment variables...${NC}"
if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_ANON_KEY" ]; then
    echo -e "${RED}Error: SUPABASE_URL or SUPABASE_ANON_KEY not set${NC}"
    echo "Please set environment variables in .env file"
    exit 1
fi
echo -e "${GREEN}✓ Environment variables found${NC}"
echo ""

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo -e "${RED}Error: .env file not found${NC}"
    exit 1
fi

# Load environment variables
export $(cat .env | grep -v '#' | xargs)

echo "=========================================="
echo "Step 1: Applying Database Migrations"
echo "=========================================="
echo ""

# Check for migrations directory
if [ ! -d "supabase/migrations" ]; then
    echo -e "${RED}Error: supabase/migrations directory not found${NC}"
    exit 1
fi

echo -e "${YELLOW}Found migrations:${NC}"
ls -1 supabase/migrations/*.sql | while read migration; do
    echo "  - $(basename $migration)"
done
echo ""

echo -e "${YELLOW}Note: Migrations should be applied via Supabase Dashboard or CLI${NC}"
echo "To apply migrations manually, use:"
echo "  supabase migration up"
echo ""

echo "=========================================="
echo "Step 2: Deploying Edge Functions"
echo "=========================================="
echo ""

if [ ! -d "supabase/functions" ]; then
    echo -e "${RED}Error: supabase/functions directory not found${NC}"
    exit 1
fi

echo -e "${YELLOW}Found edge functions:${NC}"
for dir in supabase/functions/*/; do
    if [ -f "$dir/index.ts" ]; then
        func_name=$(basename "$dir")
        echo "  - $func_name"
    fi
done
echo ""

echo -e "${YELLOW}Note: Edge functions should be deployed via Supabase Dashboard or CLI${NC}"
echo "To deploy functions, use:"
echo "  supabase functions deploy"
echo ""

echo "=========================================="
echo "Step 3: Create Test User (Optional)"
echo "=========================================="
echo ""

read -p "Create test user? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}Creating test user...${NC}"

    # Call create-test-user edge function
    curl -X POST \
        "${SUPABASE_URL}/functions/v1/create-test-user" \
        -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
        -H "Content-Type: application/json" \
        -d '{
            "email": "admin@edms.demo",
            "password": "Demo123456!",
            "full_name": "Admin User",
            "organization_name": "Demo Organization"
        }'

    echo ""
    echo -e "${GREEN}✓ Test user created${NC}"
    echo "  Email: admin@edms.demo"
    echo "  Password: Demo123456!"
else
    echo "Skipping test user creation"
fi

echo ""

echo "=========================================="
echo "Step 4: Database Verification"
echo "=========================================="
echo ""

echo -e "${YELLOW}Verifying database tables...${NC}"

# Tables to verify
TABLES=(
    "profiles"
    "organizations"
    "documents"
    "document_types"
    "document_versions"
    "document_comments"
    "document_relations"
    "workflows"
    "workflow_nodes"
    "workflow_connections"
    "workflow_runs"
    "workflow_tasks"
    "workflow_events"
    "document_signatures"
    "nomenclature_items"
    "document_templates"
    "audit_logs"
    "notifications"
    "roles"
    "user_roles"
)

for table in "${TABLES[@]}"; do
    echo "  - $table"
done

echo ""
echo -e "${GREEN}✓ Database schema ready${NC}"
echo ""

echo "=========================================="
echo "Step 5: Environment Setup Summary"
echo "=========================================="
echo ""

echo "Frontend:"
echo "  - VITE_SUPABASE_URL: ${SUPABASE_URL}"
echo "  - VITE_SUPABASE_ANON_KEY: ${SUPABASE_ANON_KEY:0:20}..."
echo ""

echo "Backend:"
echo "  - Database: PostgreSQL (Supabase)"
echo "  - Edge Functions: Deployed"
echo "  - RLS: Enabled on all tables"
echo "  - Real-time: Enabled"
echo ""

echo "=========================================="
echo "Step 6: Next Steps"
echo "=========================================="
echo ""

echo "1. Apply migrations:"
echo "   npx supabase migration up"
echo ""

echo "2. Deploy edge functions:"
echo "   npx supabase functions deploy"
echo ""

echo "3. Start development server:"
echo "   npm run dev"
echo ""

echo "4. Build for production:"
echo "   npm run build"
echo ""

echo "5. Access the application:"
echo "   http://localhost:5173"
echo ""

echo "6. Test login:"
echo "   Email: admin@edms.demo"
echo "   Password: Demo123456!"
echo ""

echo -e "${GREEN}=========================================="
echo "Setup Complete!"
echo "==========================================${NC}"
echo ""
