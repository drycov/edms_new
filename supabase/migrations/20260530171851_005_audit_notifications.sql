/*
  # EDMS Core Schema - Part 5: Audit, Notifications & Comments

  Immutable audit trail and notification system including:
  - Comprehensive audit logging
  - Comments and discussions
  - Notifications
  - Notification preferences
  - Notification delivery tracking

  Security:
  - RLS enabled
  - Audit logs immutable (INSERT only)
  - Notifications scoped to users
*/

-- ============================================
-- AUDIT LOG (IMMUTABLE)
-- ============================================

-- Create read-only role for audit
CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Actor
  user_id uuid REFERENCES auth.users(id),
  user_name text,
  user_email text,
  
  -- Action
  action text NOT NULL, -- document.created, document.updated, workflow.started, signature.added, etc.
  action_category text, -- document, workflow, signature, template, user, system
  
  -- Target
  entity_type text NOT NULL, -- documents, workflows, templates, etc.
  entity_id uuid,
  
  -- Details
  old_values jsonb,
  new_values jsonb,
  changes jsonb,
  
  -- Context
  ip_address inet,
  user_agent text,
  session_id text,
  
  -- Request info
  request_method text,
  request_path text,
  request_params jsonb,
  
  -- Additional data
  metadata jsonb DEFAULT '{}',
  
  -- Timestamp
  created_at timestamptz DEFAULT now()
);

-- Make audit logs append-only (no updates or deletes)
-- This is enforced via RLS policies

-- ============================================
-- COMMENTS
-- ============================================

CREATE TABLE IF NOT EXISTS document_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  
  -- Parent (for threads)
  parent_comment_id uuid REFERENCES document_comments(id) ON DELETE CASCADE,
  
  -- Content
  content text NOT NULL,
  
  -- Metadata
  is_internal boolean DEFAULT false, -- internal comments not visible to external users
  is_system boolean DEFAULT false, -- system-generated comments
  
  -- Status
  is_resolved boolean DEFAULT false,
  resolved_by uuid REFERENCES auth.users(id),
  resolved_at timestamptz,
  
  -- Mentions
  mentions jsonb DEFAULT '[]', -- userids mentioned
  
  -- Created by
  created_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- Soft delete
  is_deleted boolean DEFAULT false,
  deleted_at timestamptz,
  deleted_by uuid REFERENCES auth.users(id)
);

-- ============================================
-- NOTIFICATIONS
-- ============================================

CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Recipient
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Type and priority
  notification_type notification_type DEFAULT 'info',
  priority int DEFAULT 0,
  
  -- Content
  title text NOT NULL,
  message text,
  
  -- Link
  entity_type text,
  entity_id uuid,
  action_url text,
  
  -- Status
  is_read boolean DEFAULT false,
  read_at timestamptz,
  
  -- Delivery
  delivery_status jsonb DEFAULT '{}', -- {in_app: true, email: false, telegram: null}
  delivery_attempts int DEFAULT 0,
  last_delivery_attempt timestamptz,
  
  -- Data
  data jsonb DEFAULT '{}',
  
  -- Expiration
  expires_at timestamptz,
  
  created_at timestamptz DEFAULT now()
);

-- ============================================
-- NOTIFICATION PREFERENCES
-- ============================================

CREATE TABLE IF NOT EXISTS notification_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Channel preferences
  enable_in_app boolean DEFAULT true,
  enable_email boolean DEFAULT true,
  enable_telegram boolean DEFAULT false,
  enable_push boolean DEFAULT false,
  
  -- Type preferences
  preferences jsonb DEFAULT '{}', -- {"approval_required": {email: true, telegram: false}, ...}
  
  -- Quiet hours
  quiet_hours_start time,
  quiet_hours_end time,
  quiet_hours_timezone text DEFAULT 'UTC',
  
  -- Digest
  digest_enabled boolean DEFAULT false,
  digest_frequency text DEFAULT 'daily', -- immediate, hourly, daily, weekly
  digest_time time DEFAULT '09:00',
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE(user_id)
);

-- ============================================
-- NOTIFICATION DELIVERY LOG
-- ============================================

CREATE TABLE IF NOT EXISTS notification_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id uuid NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
  
  -- Channel
  channel text NOT NULL, -- in_app, email, telegram, push, webhook
  
  -- Status
  status text DEFAULT 'pending', -- pending, sent, delivered, failed, bounced
  error_message text,
  
  -- Attempts
  attempt_count int DEFAULT 0,
  last_attempt_at timestamptz,
  
  -- External reference
  external_id text,
  
  created_at timestamptz DEFAULT now(),
  delivered_at timestamptz
);

-- ============================================
-- WEBHOOKS
-- ============================================

CREATE TABLE IF NOT EXISTS webhooks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Identity
  name text NOT NULL,
  url text NOT NULL,
  secret text, -- for signature verification
  
  -- Events
  events text[] NOT NULL DEFAULT '{}', -- ['document.created', 'workflow.completed', ...]
  
  -- Status
  is_active boolean DEFAULT true,
  
  -- Retry config
  retry_count int DEFAULT 3,
  retry_delay_seconds int DEFAULT 60,
  
  -- Statistics
  last_triggered_at timestamptz,
  success_count int DEFAULT 0,
  failure_count int DEFAULT 0,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid NOT NULL REFERENCES auth.users(id)
);

-- ============================================
-- WEBHOOK DELIVERIES
-- ============================================

CREATE TABLE IF NOT EXISTS webhook_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id uuid NOT NULL REFERENCES webhooks(id) ON DELETE CASCADE,
  
  -- Event
  event_type text NOT NULL,
  entity_type text,
  entity_id uuid,
  
  -- Request
  request_headers jsonb,
  request_body jsonb,
  
  -- Response
  response_status int,
  response_headers jsonb,
  response_body text,
  
  -- Status
  status text DEFAULT 'pending', -- pending, success, failed
  
  -- Timing
  duration_ms int,
  created_at timestamptz DEFAULT now()
);

-- ============================================
-- ENABLE ROW LEVEL SECURITY
-- ============================================

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_deliveries ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS POLICIES
-- ============================================

-- Audit logs: read-only for admin
CREATE POLICY "Admins can view audit logs"
  ON audit_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid()
      AND r.permissions->>'view_audit_logs' = 'true'
    )
  );

-- No UPDATE or DELETE policies - makes audit_logs immutable

-- Comments: view for document access
CREATE POLICY "Users can view comments on accessible docs"
  ON document_comments FOR SELECT
  TO authenticated
  USING (
    document_id IN (
      SELECT id FROM documents
      WHERE organization_id IN (
        SELECT organization_id FROM profiles WHERE id = auth.uid()
      )
      AND is_deleted = false
    )
    AND (is_internal = false OR created_by = auth.uid()
         OR EXISTS (
           SELECT 1 FROM user_roles ur
           JOIN roles r ON r.id = ur.role_id
           WHERE ur.user_id = auth.uid()
           AND r.permissions->>'view_internal_comments' = 'true'
         ))
  );

CREATE POLICY "Users can create comments on accessible docs"
  ON document_comments FOR INSERT
  TO authenticated
  WITH CHECK (
    document_id IN (
      SELECT id FROM documents
      WHERE organization_id IN (
        SELECT organization_id FROM profiles WHERE id = auth.uid()
      )
      AND is_deleted = false
    )
    AND created_by = auth.uid()
  );

-- Notifications: own notifications only
CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Notification preferences: own only
CREATE POLICY "Users can manage own notification preferences"
  ON notification_preferences FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Webhooks: manage by admins
CREATE POLICY "Admins can manage webhooks"
  ON webhooks FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid()
      AND r.permissions->>'manage_webhooks' = 'true'
    )
  );

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX idx_audit_logs_org ON audit_logs(organization_id);
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at DESC);

CREATE INDEX idx_comments_document ON document_comments(document_id);
CREATE INDEX idx_comments_parent ON document_comments(parent_comment_id);
CREATE INDEX idx_comments_created ON document_comments(created_at DESC);

CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_unread ON notifications(user_id, is_read) WHERE is_read = false;
CREATE INDEX idx_notifications_created ON notifications(created_at DESC);

CREATE INDEX idx_notification_deliveries_notification ON notification_deliveries(notification_id);

CREATE INDEX idx_webhooks_org ON webhooks(organization_id);
CREATE INDEX idx_webhook_deliveries_webhook ON webhook_deliveries(webhook_id);

-- ============================================
-- TRIGGERS
-- ============================================

CREATE TRIGGER update_document_comments_updated
  BEFORE UPDATE ON document_comments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_notification_preferences_updated
  BEFORE UPDATE ON notification_preferences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_webhooks_updated
  BEFORE UPDATE ON webhooks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Automatically create notification preferences for new users
CREATE OR REPLACE FUNCTION create_notification_preferences()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO notification_preferences (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER create_user_notification_preferences
  AFTER INSERT ON profiles
  FOR EACH ROW EXECUTE FUNCTION create_notification_preferences();
