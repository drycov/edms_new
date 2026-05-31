/*
  # EDMS Core Schema - Part 1: Foundation

  Enterprise Document Management System core tables for:
  - User management and authentication
  - Organization structure (departments, roles)
  - RBAC foundation
  - System configuration

  Security:
  - RLS enabled on all tables
  - Policies restrict access based on auth.uid()
  - Organization-based multi-tenancy foundation
*/

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- ENUMS AND CUSTOM TYPES
-- ============================================

CREATE TYPE document_status AS ENUM (
  'draft',
  'registered',
  'in_workflow',
  'pending_approval',
  'approved',
  'rejected',
  'signed',
  'archived',
  'deleted'
);

CREATE TYPE workflow_status AS ENUM (
  'idle',
  'running',
  'completed',
  'cancelled',
  'error',
  'paused'
);

CREATE TYPE workflow_node_type AS ENUM (
  'start',
  'approval',
  'condition',
  'task',
  'timer',
  'escalation',
  'notification',
  'signature',
  'archive',
  'parallel',
  'merge',
  'end'
);

CREATE TYPE signature_type AS ENUM (
  'cms_pkcs7',
  'xmldsig',
  'pades'
);

CREATE TYPE signature_status AS ENUM (
  'pending',
  'valid',
  'invalid',
  'expired',
  'revoked'
);

CREATE TYPE notification_type AS ENUM (
  'info',
  'warning',
  'error',
  'sla_warning',
  'sla_violation',
  'approval_required',
  'signature_required',
  'document_assigned'
);

-- ============================================
-- ORGANIZATIONS & DEPARTMENTS
-- ============================================

CREATE TABLE IF NOT EXISTS organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  short_name text,
  type text DEFAULT 'company',
  config jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

CREATE TABLE IF NOT EXISTS departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  parent_id uuid REFERENCES departments(id) ON DELETE SET NULL,
  name text NOT NULL,
  code text,
  head_user_id uuid REFERENCES auth.users(id),
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================
-- USERS & PROFILES
-- ============================================

CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id uuid REFERENCES organizations(id),
  department_id uuid REFERENCES departments(id),
  full_name text,
  position text,
  phone text,
  avatar_url text,
  bio text,
  preferences jsonb DEFAULT '{}',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================
-- RBAC: ROLES & PERMISSIONS
-- ============================================

CREATE TABLE IF NOT EXISTS roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  display_name text,
  description text,
  is_system boolean DEFAULT false,
  permissions jsonb DEFAULT '{}',
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role_id uuid NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  department_id uuid REFERENCES departments(id) ON DELETE CASCADE,
  valid_from timestamptz DEFAULT now(),
  valid_until timestamptz,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, role_id, department_id)
);

-- ============================================
-- PRIORITY TABLES (Lookup)
-- ============================================

CREATE TABLE IF NOT EXISTS priorities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  level int NOT NULL DEFAULT 0,
  color text DEFAULT '#gray',
  sla_hours int,
  created_at timestamptz DEFAULT now()
);

-- ============================================
-- ENABLE ROW LEVEL SECURITY
-- ============================================

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE priorities ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS POLICIES
-- ============================================

-- Organizations: users can see their organization
CREATE POLICY "Users can view own organization"
  ON organizations FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update own organization"
  ON organizations FOR UPDATE
  TO authenticated
  USING (
    id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Departments: users can view departments in their org
CREATE POLICY "Users can view departments in org"
  ON departments FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can manage departments with role"
  ON departments FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid()
      AND r.permissions->>'manage_departments' = 'true'
    )
  );

-- Profiles: users can read own profile
CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Roles: read in own org
CREATE POLICY "Users can view roles in org"
  ON roles FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
    OR organization_id IS NULL
  );

-- User roles: read own roles
CREATE POLICY "Users can view own roles"
  ON user_roles FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Priorities: read in org
CREATE POLICY "Users can view priorities in org"
  ON priorities FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX idx_departments_org ON departments(organization_id);
CREATE INDEX idx_departments_parent ON departments(parent_id);
CREATE INDEX idx_profiles_org ON profiles(organization_id);
CREATE INDEX idx_profiles_dept ON profiles(department_id);
CREATE INDEX idx_roles_org ON roles(organization_id);
CREATE INDEX idx_user_roles_user ON user_roles(user_id);
CREATE INDEX idx_user_roles_role ON user_roles(role_id);

-- ============================================
-- TRIGGERS
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_organizations_updated
  BEFORE UPDATE ON organizations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_departments_updated
  BEFORE UPDATE ON departments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_profiles_updated
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_roles_updated
  BEFORE UPDATE ON roles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
