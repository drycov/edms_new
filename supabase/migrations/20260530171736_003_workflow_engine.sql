/*
  # EDMS Core Schema - Part 3: Workflow Engine

  Complete workflow engine with:
  - Workflow definitions (templates)
  - Workflow nodes and connections
  - Workflow instances (runs)
  - Workflow events and state
  - SLA management
  - Task assignments

  Security:
  - RLS enabled
  - Access controlled by workflow participants
*/

-- ============================================
-- WORKFLOW DEFINITIONS
-- ============================================

CREATE TABLE IF NOT EXISTS workflows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Identity
  name text NOT NULL,
  code text NOT NULL,
  description text,
  
  -- Version control
  version int DEFAULT 1,
  is_published boolean DEFAULT false,
  published_at timestamptz,
  
  -- Configuration
  is_active boolean DEFAULT true,
  auto_start boolean DEFAULT false,
  allow_restart boolean DEFAULT false,
  
  -- SLA
  default_sla_hours int,
  escalation_config jsonb DEFAULT '{}',
  
  -- Metadata
  metadata jsonb DEFAULT '{}',
  
  -- Audit
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid NOT NULL REFERENCES auth.users(id),
  
  UNIQUE(organization_id, code, version)
);

-- ============================================
-- WORKFLOW NODES
-- ============================================

CREATE TABLE IF NOT EXISTS workflow_nodes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id uuid NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  
  -- Node identity
  node_key text NOT NULL, -- unique key within workflow
  name text NOT NULL,
  description text,
  
  -- Type and behavior
  node_type workflow_node_type NOT NULL DEFAULT 'task',
  
  -- Position (for visual designer)
  position_x float DEFAULT 0,
  position_y float DEFAULT 0,
  
  -- Configuration
  config jsonb DEFAULT '{}', -- type-specific config
  
  -- Assignment
  assignee_type text DEFAULT 'static', -- static, dynamic, role, department, initiator
  assignee_value jsonb,
  
  -- SLA
  sla_hours int,
  
  -- Timeout
  timeout_hours int,
  timeout_action text, -- escalate, auto_approve, auto_reject, notify
  
  -- Metadata
  metadata jsonb DEFAULT '{}',
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE(workflow_id, node_key)
);

-- ============================================
-- WORKFLOW CONNECTIONS (Edges)
-- ============================================

CREATE TABLE IF NOT EXISTS workflow_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id uuid NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  
  -- Connection
  source_node_id uuid NOT NULL REFERENCES workflow_nodes(id) ON DELETE CASCADE,
  target_node_id uuid NOT NULL REFERENCES workflow_nodes(id) ON DELETE CASCADE,
  
  -- Condition (for routing)
  condition_type text, -- always, expression, user_choice
  condition_expression jsonb,
  
  -- Label
  label text,
  
  -- Order (for branching)
  order_index int DEFAULT 0,
  
  created_at timestamptz DEFAULT now(),
  
  UNIQUE(source_node_id, target_node_id)
);

-- ============================================
-- WORKFLOW INSTANCES (Runs)
-- ============================================

CREATE TABLE IF NOT EXISTS workflow_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id uuid NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  
  -- Document binding
  document_id uuid REFERENCES documents(id) ON DELETE CASCADE,
  
  -- Status
  status workflow_status DEFAULT 'idle',
  
  -- Current state
  current_nodes jsonb DEFAULT '[]', -- array of current node keys
  current_node_ids jsonb DEFAULT '[]', -- array of current node ids
  
  -- Variables
  variables jsonb DEFAULT '{}',
  
  -- Timing
  started_at timestamptz,
  completed_at timestamptz,
  
  -- SLA tracking
  sla_deadline timestamptz,
  sla_status text DEFAULT 'on_track',
  
  -- Participants
  initiator_id uuid NOT NULL REFERENCES auth.users(id),
  
  -- Metadata
  metadata jsonb DEFAULT '{}',
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================
-- WORKFLOW EVENTS (State transitions)
-- ============================================

CREATE TABLE IF NOT EXISTS workflow_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_run_id uuid NOT NULL REFERENCES workflow_runs(id) ON DELETE CASCADE,
  
  -- Event type
  event_type text NOT NULL, -- started, node_entered, node_completed, transition, completed, cancelled, error, escalation
  
  -- Node reference
  node_id uuid REFERENCES workflow_nodes(id),
  node_key text,
  
  -- Transition
  from_node_id uuid REFERENCES workflow_nodes(id),
  to_node_id uuid REFERENCES workflow_nodes(id),
  
  -- Actor
  actor_id uuid REFERENCES auth.users(id),
  
  -- Data
  data jsonb DEFAULT '{}',
  
  -- Timestamp
  created_at timestamptz DEFAULT now()
);

-- ============================================
-- WORKFLOW TASKS
-- ============================================

CREATE TABLE IF NOT EXISTS workflow_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_run_id uuid NOT NULL REFERENCES workflow_runs(id) ON DELETE CASCADE,
  workflow_node_id uuid NOT NULL REFERENCES workflow_nodes(id) ON DELETE CASCADE,
  
  -- Assignment
  assignee_id uuid REFERENCES auth.users(id),
  assignee_type text, -- user, role, department
  assignee_value jsonb,
  
  -- Status
  status text DEFAULT 'pending', -- pending, in_progress, completed, cancelled, delegated
  result text, -- approved, rejected, signed, etc.
  
  -- Delegation chain
  delegated_from_task_id uuid REFERENCES workflow_tasks(id),
  delegation_chain jsonb DEFAULT '[]',
  
  -- Comments
  comment text,
  
  -- Timing
  due_date timestamptz,
  sla_deadline timestamptz,
  
  started_at timestamptz,
  completed_at timestamptz,
  
  -- Metadata
  metadata jsonb DEFAULT '{}',
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================
-- SLA CONFIGURATIONS
-- ============================================

CREATE TABLE IF NOT EXISTS sla_configurations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  name text NOT NULL,
  code text,
  
  -- SLA rules
  response_hours int,
  resolution_hours int,
  
  -- Escalation
  escalation_levels jsonb DEFAULT '[]',
  
  -- Calendar
  work_calendar_id uuid, -- reference for business hours
  
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE(organization_id, code)
);

-- ============================================
-- WORKFLOW DELEGATIONS
-- ============================================

CREATE TABLE IF NOT EXISTS workflow_delegations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  from_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  to_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Scope
  workflow_id uuid REFERENCES workflows(id) ON DELETE CASCADE,
  department_id uuid REFERENCES departments(id) ON DELETE CASCADE,
  
  -- Time range
  valid_from timestamptz NOT NULL,
  valid_until timestamptz,
  
  -- Reason
  reason text,
  
  -- Status
  is_active boolean DEFAULT true,
  
  created_at timestamptz DEFAULT now(),
  created_by uuid NOT NULL REFERENCES auth.users(id)
);

-- ============================================
-- ENABLE ROW LEVEL SECURITY
-- ============================================

ALTER TABLE workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE sla_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_delegations ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS POLICIES
-- ============================================

-- Workflows: read in org
CREATE POLICY "Users can view workflows in org"
  ON workflows FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can manage workflows with permission"
  ON workflows FOR ALL
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
        AND r.permissions->>'manage_workflows' = 'true'
      )
    )
  );

-- Workflow Runs: read own or involved
CREATE POLICY "Users can view involved workflow runs"
  ON workflow_runs FOR SELECT
  TO authenticated
  USING (
    initiator_id = auth.uid()
    OR workflow_id IN (
      SELECT id FROM workflows
      WHERE organization_id IN (
        SELECT organization_id FROM profiles WHERE id = auth.uid()
      )
    )
    OR id IN (
      SELECT workflow_run_id FROM workflow_tasks WHERE assignee_id = auth.uid()
    )
  );

-- Workflow Tasks: read assigned tasks
CREATE POLICY "Users can view assigned tasks"
  ON workflow_tasks FOR SELECT
  TO authenticated
  USING (
    assignee_id = auth.uid()
    OR workflow_run_id IN (
      SELECT id FROM workflow_runs WHERE initiator_id = auth.uid()
    )
  );

CREATE POLICY "Users can update assigned tasks"
  ON workflow_tasks FOR UPDATE
  TO authenticated
  USING (assignee_id = auth.uid())
  WITH CHECK (assignee_id = auth.uid());

-- Workflow Events: read for accessible runs
CREATE POLICY "Users can view events for accessible runs"
  ON workflow_events FOR SELECT
  TO authenticated
  USING (
    workflow_run_id IN (
      SELECT id FROM workflow_runs
      WHERE initiator_id = auth.uid()
      OR id IN (
        SELECT workflow_run_id FROM workflow_tasks WHERE assignee_id = auth.uid()
      )
    )
  );

-- SLA Configurations: read in org
CREATE POLICY "Users can view SLA configs in org"
  ON sla_configurations FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Delegations: view own delegations
CREATE POLICY "Users can view own delegations"
  ON workflow_delegations FOR SELECT
  TO authenticated
  USING (
    from_user_id = auth.uid() OR to_user_id = auth.uid() OR created_by = auth.uid()
  );

CREATE POLICY "Users can manage own delegations"
  ON workflow_delegations FOR ALL
  TO authenticated
  USING (
    from_user_id = auth.uid() OR created_by = auth.uid()
  );

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX idx_workflows_org ON workflows(organization_id);
CREATE INDEX idx_workflows_code ON workflows(code);
CREATE INDEX idx_workflow_nodes_workflow ON workflow_nodes(workflow_id);
CREATE INDEX idx_workflow_connections_workflow ON workflow_connections(workflow_id);
CREATE INDEX idx_workflow_runs_workflow ON workflow_runs(workflow_id);
CREATE INDEX idx_workflow_runs_document ON workflow_runs(document_id);
CREATE INDEX idx_workflow_runs_status ON workflow_runs(status);
CREATE INDEX idx_workflow_events_run ON workflow_events(workflow_run_id);
CREATE INDEX idx_workflow_tasks_run ON workflow_tasks(workflow_run_id);
CREATE INDEX idx_workflow_tasks_assignee ON workflow_tasks(assignee_id);
CREATE INDEX idx_workflow_tasks_status ON workflow_tasks(status);
CREATE INDEX idx_sla_configs_org ON sla_configurations(organization_id);

-- ============================================
-- TRIGGERS
-- ============================================

CREATE TRIGGER update_workflows_updated
  BEFORE UPDATE ON workflows
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_workflow_tasks_updated
  BEFORE UPDATE ON workflow_tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_sla_configurations_updated
  BEFORE UPDATE ON sla_configurations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Update foreign key references in previously created tables
ALTER TABLE nomenclature_items
  ADD CONSTRAINT fk_nomenclature_workflow
  FOREIGN KEY (default_workflow_id) REFERENCES workflows(id) ON DELETE SET NULL;

ALTER TABLE document_types
  ADD CONSTRAINT fk_doc_type_workflow
  FOREIGN KEY (default_workflow_id) REFERENCES workflows(id) ON DELETE SET NULL;

ALTER TABLE documents
  ADD CONSTRAINT fk_document_workflow_run
  FOREIGN KEY (workflow_run_id) REFERENCES workflow_runs(id) ON DELETE SET NULL;
