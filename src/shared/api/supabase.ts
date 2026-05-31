import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

export type Database = {
  public: {
    Tables: {
      organizations: {
        Row: {
          id: string;
          name: string;
          short_name: string | null;
          type: string;
          config: Record<string, unknown>;
          created_at: string;
          updated_at: string;
          created_by: string | null;
        };
        Insert: {
          id?: string;
          name: string;
          short_name?: string;
          type?: string;
          config?: Record<string, unknown>;
          created_at?: string;
          updated_at?: string;
          created_by?: string;
        };
        Update: {
          id?: string;
          name?: string;
          short_name?: string;
          type?: string;
          config?: Record<string, unknown>;
          created_at?: string;
          updated_at?: string;
          created_by?: string;
        };
      };
      departments: {
        Row: {
          id: string;
          organization_id: string;
          parent_id: string | null;
          name: string;
          code: string | null;
          head_user_id: string | null;
          metadata: Record<string, unknown>;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          parent_id?: string;
          name: string;
          code?: string;
          head_user_id?: string;
          metadata?: Record<string, unknown>;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          parent_id?: string;
          name?: string;
          code?: string;
          head_user_id?: string;
          metadata?: Record<string, unknown>;
          created_at?: string;
          updated_at?: string;
        };
      };
      profiles: {
        Row: {
          id: string;
          organization_id: string | null;
          department_id: string | null;
          full_name: string | null;
          position: string | null;
          phone: string | null;
          avatar_url: string | null;
          bio: string | null;
          preferences: Record<string, unknown>;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          organization_id?: string;
          department_id?: string;
          full_name?: string;
          position?: string;
          phone?: string;
          avatar_url?: string;
          bio?: string;
          preferences?: Record<string, unknown>;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          department_id?: string;
          full_name?: string;
          position?: string;
          phone?: string;
          avatar_url?: string;
          bio?: string;
          preferences?: Record<string, unknown>;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      documents: {
        Row: {
          id: string;
          organization_id: string;
          document_type_id: string | null;
          nomenclature_item_id: string | null;
          registration_number: string | null;
          registration_date: string | null;
          title: string;
          description: string | null;
          content: string | null;
          summary: string | null;
          version: number;
          version_label: string;
          status: string;
          workflow_run_id: string | null;
          priority_id: string | null;
          document_date: string | null;
          due_date: string | null;
          is_confidential: boolean;
          access_level: string;
          tags: string[];
          keywords: string[];
          metadata: Record<string, unknown>;
          is_archived: boolean;
          archived_at: string | null;
          archive_reason: string | null;
          is_deleted: boolean;
          deleted_at: string | null;
          deleted_by: string | null;
          created_at: string;
          updated_at: string;
          created_by: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          document_type_id?: string;
          nomenclature_item_id?: string;
          registration_number?: string;
          registration_date?: string;
          title: string;
          description?: string;
          content?: string;
          summary?: string;
          version?: number;
          version_label?: string;
          status?: string;
          workflow_run_id?: string;
          priority_id?: string;
          document_date?: string;
          due_date?: string;
          is_confidential?: boolean;
          access_level?: string;
          tags?: string[];
          keywords?: string[];
          metadata?: Record<string, unknown>;
          is_archived?: boolean;
          archived_at?: string;
          archive_reason?: string;
          is_deleted?: boolean;
          deleted_at?: string;
          deleted_by?: string;
          created_at?: string;
          updated_at?: string;
          created_by: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          document_type_id?: string;
          nomenclature_item_id?: string;
          registration_number?: string;
          registration_date?: string;
          title?: string;
          description?: string;
          content?: string;
          summary?: string;
          version?: number;
          version_label?: string;
          status?: string;
          workflow_run_id?: string;
          priority_id?: string;
          document_date?: string;
          due_date?: string;
          is_confidential?: boolean;
          access_level?: string;
          tags?: string[];
          keywords?: string[];
          metadata?: Record<string, unknown>;
          is_archived?: boolean;
          archived_at?: string;
          archive_reason?: string;
          is_deleted?: boolean;
          deleted_at?: string;
          deleted_by?: string;
          created_at?: string;
          updated_at?: string;
          created_by?: string;
        };
      };
      workflows: {
        Row: {
          id: string;
          organization_id: string;
          name: string;
          code: string;
          description: string | null;
          version: number;
          is_published: boolean;
          published_at: string | null;
          is_active: boolean;
          auto_start: boolean;
          allow_restart: boolean;
          default_sla_hours: number | null;
          escalation_config: Record<string, unknown>;
          metadata: Record<string, unknown>;
          created_at: string;
          updated_at: string;
          created_by: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          name: string;
          code: string;
          description?: string;
          version?: number;
          is_published?: boolean;
          published_at?: string;
          is_active?: boolean;
          auto_start?: boolean;
          allow_restart?: boolean;
          default_sla_hours?: number;
          escalation_config?: Record<string, unknown>;
          metadata?: Record<string, unknown>;
          created_at?: string;
          updated_at?: string;
          created_by: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          name?: string;
          code?: string;
          description?: string;
          version?: number;
          is_published?: boolean;
          published_at?: string;
          is_active?: boolean;
          auto_start?: boolean;
          allow_restart?: boolean;
          default_sla_hours?: number;
          escalation_config?: Record<string, unknown>;
          metadata?: Record<string, unknown>;
          created_at?: string;
          updated_at?: string;
          created_by?: string;
        };
      };
      workflow_runs: {
        Row: {
          id: string;
          workflow_id: string;
          document_id: string | null;
          status: string;
          current_nodes: string[];
          current_node_ids: string[];
          variables: Record<string, unknown>;
          started_at: string | null;
          completed_at: string | null;
          sla_deadline: string | null;
          sla_status: string;
          initiator_id: string;
          metadata: Record<string, unknown>;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          workflow_id: string;
          document_id?: string;
          status?: string;
          current_nodes?: string[];
          current_node_ids?: string[];
          variables?: Record<string, unknown>;
          started_at?: string;
          completed_at?: string;
          sla_deadline?: string;
          sla_status?: string;
          initiator_id: string;
          metadata?: Record<string, unknown>;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          workflow_id?: string;
          document_id?: string;
          status?: string;
          current_nodes?: string[];
          current_node_ids?: string[];
          variables?: Record<string, unknown>;
          started_at?: string;
          completed_at?: string;
          sla_deadline?: string;
          sla_status?: string;
          initiator_id?: string;
          metadata?: Record<string, unknown>;
          created_at?: string;
          updated_at?: string;
        };
      };
      workflow_tasks: {
        Row: {
          id: string;
          workflow_run_id: string;
          workflow_node_id: string;
          assignee_id: string | null;
          assignee_type: string | null;
          assignee_value: Record<string, unknown> | null;
          status: string;
          result: string | null;
          delegated_from_task_id: string | null;
          delegation_chain: string[];
          comment: string | null;
          due_date: string | null;
          sla_deadline: string | null;
          started_at: string | null;
          completed_at: string | null;
          metadata: Record<string, unknown>;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          workflow_run_id: string;
          workflow_node_id: string;
          assignee_id?: string;
          assignee_type?: string;
          assignee_value?: Record<string, unknown>;
          status?: string;
          result?: string;
          delegated_from_task_id?: string;
          delegation_chain?: string[];
          comment?: string;
          due_date?: string;
          sla_deadline?: string;
          started_at?: string;
          completed_at?: string;
          metadata?: Record<string, unknown>;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          workflow_run_id?: string;
          workflow_node_id?: string;
          assignee_id?: string;
          assignee_type?: string;
          assignee_value?: Record<string, unknown>;
          status?: string;
          result?: string;
          delegated_from_task_id?: string;
          delegation_chain?: string[];
          comment?: string;
          due_date?: string;
          sla_deadline?: string;
          started_at?: string;
          completed_at?: string;
          metadata?: Record<string, unknown>;
          created_at?: string;
          updated_at?: string;
        };
      };
      notifications: {
        Row: {
          id: string;
          organization_id: string;
          user_id: string;
          notification_type: string;
          priority: number;
          title: string;
          message: string | null;
          entity_type: string | null;
          entity_id: string | null;
          action_url: string | null;
          is_read: boolean;
          read_at: string | null;
          delivery_status: Record<string, unknown>;
          delivery_attempts: number;
          last_delivery_attempt: string | null;
          data: Record<string, unknown>;
          expires_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          user_id: string;
          notification_type?: string;
          priority?: number;
          title: string;
          message?: string;
          entity_type?: string;
          entity_id?: string;
          action_url?: string;
          is_read?: boolean;
          read_at?: string;
          delivery_status?: Record<string, unknown>;
          delivery_attempts?: number;
          last_delivery_attempt?: string;
          data?: Record<string, unknown>;
          expires_at?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          user_id?: string;
          notification_type?: string;
          priority?: number;
          title?: string;
          message?: string;
          entity_type?: string;
          entity_id?: string;
          action_url?: string;
          is_read?: boolean;
          read_at?: string;
          delivery_status?: Record<string, unknown>;
          delivery_attempts?: number;
          last_delivery_attempt?: string;
          data?: Record<string, unknown>;
          expires_at?: string;
          created_at?: string;
        };
      };
    };
    Views: {};
    Functions: {};
    Enums: {};
  };
};

export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row'];
export type InsertTables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert'];
export type UpdateTables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update'];
