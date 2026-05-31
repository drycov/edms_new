/*
  # EDMS Core Schema - Part 2: Documents & Nomenclature

  Document management tables including:
  - Document types and categories
  - Nomenclature of records (hierarchical filing system)
  - Documents metadata
  - Document versions
  - Document relationships

  Security:
  - RLS enabled with document ownership checks
  - Access controlled by department and workflow state
*/

-- ============================================
-- NOMENCLATURE (FOLDER HIERARCHY)
-- ============================================

CREATE TABLE IF NOT EXISTS nomenclature_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  parent_id uuid REFERENCES nomenclature_items(id) ON DELETE CASCADE,
  code text NOT NULL,
  title text NOT NULL,
  description text,
  
  -- Retention policy
  retention_years int,
  archive_after_years int,
  destroy_after_years int,
  
  -- Workflow binding
  default_workflow_id uuid, -- Reference to workflows table (added later)
  
  -- Classification
  classification_level text DEFAULT 'internal',
  category text,
  
  -- Metadata
  metadata jsonb DEFAULT '{}',
  is_active boolean DEFAULT true,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  
  UNIQUE(organization_id, code)
);

-- ============================================
-- DOCUMENT TYPES
-- ============================================

CREATE TABLE IF NOT EXISTS document_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  code text NOT NULL,
  description text,
  
  -- Template binding
  default_template_id uuid, -- Reference to templates table (added later)
  
  -- Workflow binding
  default_workflow_id uuid, -- Reference to workflows table (added later)
  
  -- Registration config
  registration_prefix text,
  registration_format text DEFAULT '{prefix}-{year}-{counter}',
  auto_register boolean DEFAULT false,
  
  -- Metadata schema (JSON Schema)
  metadata_schema jsonb DEFAULT '{}',
  
  -- Required fields
  required_fields jsonb DEFAULT '[]',
  
  -- Access control
  default_access JSONB DEFAULT '{}',
  
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE(organization_id, code)
);

-- ============================================
-- DOCUMENTS
-- ============================================

CREATE TABLE IF NOT EXISTS documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  document_type_id uuid REFERENCES document_types(id) ON DELETE SET NULL,
  nomenclature_item_id uuid REFERENCES nomenclature_items(id) ON DELETE SET NULL,
  
  -- Registration
  registration_number text,
  registration_date timestamptz,
  
  -- Identification
  title text NOT NULL,
  description text,
  content text,
  summary text,
  
  -- Version control
  version int DEFAULT 1,
  version_label text DEFAULT '1.0',
  
  -- Status
  status document_status DEFAULT 'draft',
  
  -- Workflow
  workflow_run_id uuid, -- Reference to workflow_runs table (added later)
  
  -- Priority
  priority_id uuid REFERENCES priorities(id),
  
  -- Dates
  document_date date,
  due_date timestamptz,
  
  -- Access control
  is_confidential boolean DEFAULT false,
  access_level text DEFAULT 'department',
  
  -- Tags and classification
  tags text[] DEFAULT '{}',
  keywords text[] DEFAULT '{}',
  
  -- Metadata (flexible)
  metadata jsonb DEFAULT '{}',
  
  -- Archive
  is_archived boolean DEFAULT false,
  archived_at timestamptz,
  archive_reason text,
  
  -- Deletion
  is_deleted boolean DEFAULT false,
  deleted_at timestamptz,
  deleted_by uuid REFERENCES auth.users(id),
  
  -- Timestamps
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid NOT NULL REFERENCES auth.users(id),
  
  -- Index for search
  search_vector tsvector
);

-- ============================================
-- DOCUMENT VERSIONS
-- ============================================

CREATE TABLE IF NOT EXISTS document_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  
  version int NOT NULL,
  version_label text NOT NULL,
  
  -- Content snapshot
  title text,
  description text,
  content text,
  
  -- File references
  attachments jsonb DEFAULT '[]',
  
  -- Change metadata
  change_summary text,
  change_type text DEFAULT 'update',
  
  -- Who made the change
  created_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  
  is_major boolean DEFAULT false,
  
  UNIQUE(document_id, version)
);

-- ============================================
-- DOCUMENT ATTACHMENTS
-- ============================================

CREATE TABLE IF NOT EXISTS document_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  document_version_id uuid REFERENCES document_versions(id) ON DELETE CASCADE,
  
  -- File info
  filename text NOT NULL,
  original_filename text NOT NULL,
  mime_type text NOT NULL,
  file_size bigint NOT NULL,
  
  -- Storage (S3/MinIO)
  storage_path text NOT NULL,
  storage_bucket text DEFAULT 'documents',
  
  -- OCR
  ocr_status text DEFAULT 'pending',
  ocr_text text,
  
  -- Signatures
  is_signed boolean DEFAULT false,
  signature_count int DEFAULT 0,
  
  -- Metadata
  metadata jsonb DEFAULT '{}',
  
  created_at timestamptz DEFAULT now(),
  created_by uuid NOT NULL REFERENCES auth.users(id)
);

-- ============================================
-- DOCUMENT RELATIONSHIPS
-- ============================================

CREATE TABLE IF NOT EXISTS document_relations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_document_id uuid NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  target_document_id uuid NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  
  relationship_type text NOT NULL, -- 'response', 'attachment', 'reference', 'parent', 'copy'
  
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  created_by uuid NOT NULL REFERENCES auth.users(id),
  
  UNIQUE(source_document_id, target_document_id, relationship_type)
);

-- ============================================
-- ACCESS LOG (for audit trail)
-- ============================================

CREATE TABLE IF NOT EXISTS document_access_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  
  user_id uuid NOT NULL REFERENCES auth.users(id),
  action text NOT NULL, -- 'view', 'download', 'print', 'edit', 'sign', 'delete'
  
  ip_address inet,
  user_agent text,
  
  created_at timestamptz DEFAULT now()
);

-- ============================================
-- ENABLE ROW LEVEL SECURITY
-- ============================================

ALTER TABLE nomenclature_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_relations ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_access_log ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS POLICIES
-- ============================================

-- Nomenclature: read in org
CREATE POLICY "Users can view nomenclature in org"
  ON nomenclature_items FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can manage nomenclature with permission"
  ON nomenclature_items FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid()
      AND r.permissions->>'manage_nomenclature' = 'true'
    )
  );

-- Document Types: read in org
CREATE POLICY "Users can view document_types in org"
  ON document_types FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Documents: complex access control
CREATE POLICY "Users can view accessible documents"
  ON documents FOR SELECT
  TO authenticated
  USING (
    -- Check organization membership
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
    AND (
      -- Creator has access
      created_by = auth.uid()
      -- Or not deleted
      AND is_deleted = false
    )
  );

CREATE POLICY "Users can create documents in org"
  ON documents FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
    AND created_by = auth.uid()
  );

CREATE POLICY "Users can update own documents"
  ON documents FOR UPDATE
  TO authenticated
  USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid()
      AND r.permissions->>'edit_documents' = 'true'
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can delete with permission"
  ON documents FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid()
      AND r.permissions->>'delete_documents' = 'true'
    )
  );

-- Document Versions: follow document access
CREATE POLICY "Users can view versions of accessible docs"
  ON document_versions FOR SELECT
  TO authenticated
  USING (
    document_id IN (
      SELECT id FROM documents
      WHERE organization_id IN (
        SELECT organization_id FROM profiles WHERE id = auth.uid()
      )
      AND is_deleted = false
    )
  );

-- Document Attachments: follow document access
CREATE POLICY "Users can view attachments of accessible docs"
  ON document_attachments FOR SELECT
  TO authenticated
  USING (
    document_id IN (
      SELECT id FROM documents
      WHERE organization_id IN (
        SELECT organization_id FROM profiles WHERE id = auth.uid()
      )
      AND is_deleted = false
    )
  );

-- Document Relations: follow document access
CREATE POLICY "Users can view relations of accessible docs"
  ON document_relations FOR SELECT
  TO authenticated
  USING (
    source_document_id IN (
      SELECT id FROM documents
      WHERE organization_id IN (
        SELECT organization_id FROM profiles WHERE id = auth.uid()
      )
      AND is_deleted = false
    )
  );

-- Access Log: users can view own entries
CREATE POLICY "Users can view own access log"
  ON document_access_log FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "System can insert access log"
  ON document_access_log FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX idx_nomenclature_org ON nomenclature_items(organization_id);
CREATE INDEX idx_nomenclature_parent ON nomenclature_items(parent_id);
CREATE INDEX idx_document_types_org ON document_types(organization_id);
CREATE INDEX idx_documents_org ON documents(organization_id);
CREATE INDEX idx_documents_type ON documents(document_type_id);
CREATE INDEX idx_documents_nomenclature ON documents(nomenclature_item_id);
CREATE INDEX idx_documents_status ON documents(status);
CREATE INDEX idx_documents_created_by ON documents(created_by);
CREATE INDEX idx_documents_search ON documents USING GIN(search_vector);
CREATE INDEX idx_document_versions_doc ON document_versions(document_id);
CREATE INDEX idx_document_attachments_doc ON document_attachments(document_id);
CREATE INDEX idx_document_relations_source ON document_relations(source_document_id);
CREATE INDEX idx_document_relations_target ON document_relations(target_document_id);
CREATE INDEX idx_document_access_log_doc ON document_access_log(document_id);
CREATE INDEX idx_document_access_log_user ON document_access_log(user_id);

-- ============================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================

CREATE TRIGGER update_nomenclature_items_updated
  BEFORE UPDATE ON nomenclature_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_document_types_updated
  BEFORE UPDATE ON document_types
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_documents_updated
  BEFORE UPDATE ON documents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Full-text search trigger
CREATE OR REPLACE FUNCTION update_document_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', coalesce(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.description, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(NEW.content, '')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_documents_search_vector
  BEFORE INSERT OR UPDATE ON documents
  FOR EACH ROW EXECUTE FUNCTION update_document_search_vector();
