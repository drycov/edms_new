/*
  # EDMS Core Schema - Part 4: Templates & Signatures

  Document templates and digital signature support including:
  - Document templates (DOCX, XLSX, PDF)
  - Template variables
  - Template versions
  - Generated documents from templates
  - Digital signatures (NCALayer integration)
  - Signature verification

  Security:
  - RLS enabled
  - Templates restricted to authorized users
  - Signatures immutable after creation
*/

-- ============================================
-- DOCUMENT TEMPLATES
-- ============================================

CREATE TABLE IF NOT EXISTS document_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Identity
  name text NOT NULL,
  code text NOT NULL,
  description text,
  
  -- Template type
  template_type text NOT NULL, -- docx, xlsx, pdf, html
  
  -- File storage
  storage_path text NOT NULL,
  storage_bucket text DEFAULT 'templates',
  original_filename text,
  file_size bigint,
  
  -- Versioning
  version int DEFAULT 1,
  is_published boolean DEFAULT false,
  published_at timestamptz,
  
  -- Workflow binding
  requires_approval boolean DEFAULT true,
  approval_workflow_id uuid REFERENCES workflows(id) ON DELETE SET NULL,
  
  -- Variables schema
  variables_schema jsonb DEFAULT '{}', -- JSON Schema for variables
  computed_fields jsonb DEFAULT '[]',
  
  -- Output configuration
  output_format text DEFAULT 'pdf',
  output_filename_pattern text DEFAULT '{type}-{number}-{date}',
  
  -- Metadata
  category text,
  tags text[] DEFAULT '{}',
  metadata jsonb DEFAULT '{}',
  
  -- Access
  is_active boolean DEFAULT true,
  
  -- Audit
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid NOT NULL REFERENCES auth.users(id),
  
  UNIQUE(organization_id, code, version)
);

-- ============================================
-- TEMPLATE VARIABLES
-- ============================================

CREATE TABLE IF NOT EXISTS template_variables (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES document_templates(id) ON DELETE CASCADE,
  
  -- Variable definition
  variable_name text NOT NULL,
  variable_type text NOT NULL, -- string, number, date, user, department, document
  
  -- Default value
  default_value jsonb,
  
  -- Source
  source_type text DEFAULT 'user_input', -- user_input, system, computed, workflow_context
  source_expression text,
  
  -- Display
  display_name text,
  description text,
  is_required boolean DEFAULT true,
  order_index int DEFAULT 0,
  
  created_at timestamptz DEFAULT now(),
  
  UNIQUE(template_id, variable_name)
);

-- ============================================
-- TEMPLATE VERSIONS
-- ============================================

CREATE TABLE IF NOT EXISTS template_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES document_templates(id) ON DELETE CASCADE,
  
  version int NOT NULL,
  
  -- Storage
  storage_path text NOT NULL,
  storage_bucket text DEFAULT 'templates',
  
  -- Changes
  change_summary text,
  
  -- Status
  status text DEFAULT 'draft', -- draft, under_review, published, deprecated
  
  -- Approval
  approved_by uuid REFERENCES auth.users(id),
  approved_at timestamptz,
  
  created_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  
  UNIQUE(template_id, version)
);

-- ============================================
-- GENERATED DOCUMENTS
-- ============================================

CREATE TABLE IF NOT EXISTS generated_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  template_id uuid NOT NULL REFERENCES document_templates(id) ON DELETE CASCADE,
  template_version int,
  
  -- Variables used
  variables jsonb NOT NULL,
  
  -- Output
  output_storage_path text,
  output_format text,
  
  -- Generation metadata
  generation_time_ms int,
  
  created_at timestamptz DEFAULT now(),
  created_by uuid NOT NULL REFERENCES auth.users(id)
);

-- ============================================
-- DIGITAL SIGNATURES
-- ============================================

CREATE TABLE IF NOT EXISTS document_signatures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  attachment_id uuid REFERENCES document_attachments(id) ON DELETE CASCADE,
  
  -- Signature identity
  signature_number int NOT NULL DEFAULT 1,
  
  -- Type
  signature_type signature_type NOT NULL,
  
  -- Status
  status signature_status DEFAULT 'pending',
  
  -- Certificate info
  signer_id text NOT NULL, -- IIN/BIN for Kazakhstan
  signer_name text,
  signer_organization text,
  signer_position text,
  certificate_serial text,
  certificate_issuer text,
  certificate_not_before timestamptz,
  certificate_not_after timestamptz,
  
  -- Signature data
  signature_data bytea,
  signature_file_path text, -- detached signature file
  
  -- Timestamp
  timestamp_token bytea,
  timestamp_authority text,
  timestamp_time timestamptz,
  
  -- Verification
  verification_time timestamptz,
  verification_result jsonb,
  ocsp_response bytea,
  crl_data bytea,
  
  -- Visual signature
  visual_signature_page int,
  visual_signature_rect jsonb, -- {x, y, width, height}
  
  -- Metadata
  metadata jsonb DEFAULT '{}',
  
  -- Who initiated
  user_id uuid NOT NULL REFERENCES auth.users(id),
  
  created_at timestamptz DEFAULT now(),
  signed_at timestamptz,
  
  UNIQUE(document_id, signature_number)
);

-- ============================================
-- SIGNATURE VERIFICATION HISTORY
-- ============================================

CREATE TABLE IF NOT EXISTS signature_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  signature_id uuid NOT NULL REFERENCES document_signatures(id) ON DELETE CASCADE,
  
  -- Result
  is_valid boolean NOT NULL,
  status text NOT NULL,
  
  -- Details
  certificate_valid boolean,
  certificate_revoked boolean,
  certificate_expired boolean,
  timestamp_valid boolean,
  
  -- OCSP/CRL
  ocsp_checked boolean DEFAULT false,
  crl_checked boolean DEFAULT false,
  
  -- Details
  error_message text,
  details jsonb DEFAULT '{}',
  
  verified_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

-- ============================================
-- SIGNATURE WORKFLOW (Multi-signature)
-- ============================================

CREATE TABLE IF NOT EXISTS signature_workflows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  
  -- Workflow configuration
  is_sequential boolean DEFAULT true,
  current_signer_index int DEFAULT 0,
  
  -- Status
  status text DEFAULT 'pending', -- pending, in_progress, completed, rejected
  
  -- Metadata
  config jsonb DEFAULT '{}',
  
  created_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  created_by uuid NOT NULL REFERENCES auth.users(id)
);

-- ============================================
-- UPDATE DOCUMENT TYPES FK
-- ============================================

ALTER TABLE document_types
  ADD CONSTRAINT fk_doc_type_template
  FOREIGN KEY (default_template_id) REFERENCES document_templates(id) ON DELETE SET NULL;

-- ============================================
-- ENABLE ROW LEVEL SECURITY
-- ============================================

ALTER TABLE document_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_variables ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE generated_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_signatures ENABLE ROW LEVEL SECURITY;
ALTER TABLE signature_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE signature_workflows ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS POLICIES
-- ============================================

-- Templates: read published in org
CREATE POLICY "Users can view published templates in org"
  ON document_templates FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
    AND (is_published = true OR created_by = auth.uid())
  );

CREATE POLICY "Users can manage templates with permission"
  ON document_templates FOR ALL
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
    AND (
      created_by = auth.uid()
      OR EXISTS (
        SELECT 1 FROM user_roles ur
        JOIN roles r ON r.id = ur.role_id
        WHERE ur.user_id = auth.uid()
        AND r.permissions->>'manage_templates' = 'true'
      )
    )
  );

-- Generated Documents: follow document access
CREATE POLICY "Users can view generated docs for accessible documents"
  ON generated_documents FOR SELECT
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

-- Signatures: follow document access
CREATE POLICY "Users can view signatures for accessible docs"
  ON document_signatures FOR SELECT
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

CREATE POLICY "Users can create signatures"
  ON document_signatures FOR INSERT
  TO authenticated
  WITH CHECK (
    document_id IN (
      SELECT id FROM documents
      WHERE organization_id IN (
        SELECT organization_id FROM profiles WHERE id = auth.uid()
      )
    )
    AND user_id = auth.uid()
  );

-- Make signatures immutable after creation
CREATE POLICY "Signatures are immutable"
  ON document_signatures FOR UPDATE
  TO authenticated
  USING (id = '00000000-0000-0000-0000-000000000000'); -- Always false

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX idx_templates_org ON document_templates(organization_id);
CREATE INDEX idx_templates_code ON document_templates(code);
CREATE INDEX idx_template_variables_template ON template_variables(template_id);
CREATE INDEX idx_template_versions_template ON template_versions(template_id);
CREATE INDEX idx_generated_docs_document ON generated_documents(document_id);
CREATE INDEX idx_generated_docs_template ON generated_documents(template_id);
CREATE INDEX idx_signatures_document ON document_signatures(document_id);
CREATE INDEX idx_signatures_status ON document_signatures(status);
CREATE INDEX idx_signatures_signer ON document_signatures(signer_id);
CREATE INDEX idx_signature_verifications_sig ON signature_verifications(signature_id);

-- ============================================
-- TRIGGERS
-- ============================================

CREATE TRIGGER update_document_templates_updated
  BEFORE UPDATE ON document_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
