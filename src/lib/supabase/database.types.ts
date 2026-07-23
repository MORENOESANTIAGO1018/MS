/**
 * Tipos gerados manualmente a partir de supabase/migrations/*.sql.
 * Em um projeto Supabase real, regenerar com:
 *   supabase gen types typescript --linked > src/lib/supabase/database.types.ts
 * Mantido sincronizado manualmente neste ambiente (sem projeto Supabase hospedado
 * disponivel). Ver MODELO-DE-DADOS.md para o desenho completo.
 */

export type UserRole = "client" | "staff" | "admin";

export type FinancialStatus =
  | "pago"
  | "pendente"
  | "a_vencer"
  | "vencido"
  | "renegociado"
  | "cancelado";

export type AiSummaryStatus = "pending_review" | "approved" | "rejected" | "edited";

type WithTimestamps = {
  created_at: string;
  updated_at: string;
};

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: WithTimestamps & {
          id: string;
          role: UserRole;
          full_name: string;
          email: string;
          phone: string | null;
          is_active: boolean;
          blocked_at: string | null;
          blocked_reason: string | null;
          last_login_at: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["profiles"]["Row"]> & {
          id: string;
          role: UserRole;
          full_name: string;
          email: string;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Row"]>;
        Relationships: [];
      };
      clients: {
        Row: WithTimestamps & {
          id: string;
          full_name: string;
          document_last4: string | null;
          email: string | null;
          phone: string | null;
          whatsapp: string | null;
          status: string;
          internal_code: string | null;
          notion_page_id: string | null;
          created_by: string | null;
          archived_at: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["clients"]["Row"]> & {
          full_name: string;
        };
        Update: Partial<Database["public"]["Tables"]["clients"]["Row"]>;
        Relationships: [];
      };
      client_access: {
        Row: WithTimestamps & {
          id: string;
          profile_id: string;
          client_id: string;
          access_level: "owner" | "viewer" | "staff";
          is_active: boolean;
          revoked_at: string | null;
          revoked_by: string | null;
          invited_by: string | null;
          activation_code_hash: string | null;
          activation_code_expires_at: string | null;
          activation_used_at: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["client_access"]["Row"]> & {
          profile_id: string;
          client_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["client_access"]["Row"]>;
        Relationships: [];
      };
      processes: {
        Row: WithTimestamps & {
          id: string;
          client_id: string;
          process_number: string;
          court: string | null;
          jurisdiction: string | null;
          case_class: string | null;
          subject: string | null;
          practice_area: string | null;
          phase: string | null;
          status: string;
          responsible_team_member_id: string | null;
          client_summary: string | null;
          internal_summary: string | null;
          notion_page_id: string | null;
          is_visible_to_client: boolean;
          created_by: string | null;
          updated_by: string | null;
          archived_at: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["processes"]["Row"]> & {
          client_id: string;
          process_number: string;
        };
        Update: Partial<Database["public"]["Tables"]["processes"]["Row"]>;
        Relationships: [];
      };
      process_updates: {
        Row: WithTimestamps & {
          id: string;
          process_id: string;
          client_id: string;
          update_date: string;
          original_text: string | null;
          technical_summary: string | null;
          plain_language_summary: string | null;
          classification: string | null;
          possible_deadline: string | null;
          reviewed_by_lawyer: boolean;
          published_at: string | null;
          notion_page_id: string | null;
          is_visible_to_client: boolean;
          created_by: string | null;
          updated_by: string | null;
          archived_at: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["process_updates"]["Row"]> & {
          process_id: string;
          client_id: string;
          update_date: string;
        };
        Update: Partial<Database["public"]["Tables"]["process_updates"]["Row"]>;
        Relationships: [];
      };
      hearings: {
        Row: WithTimestamps & {
          id: string;
          process_id: string;
          client_id: string;
          title: string;
          hearing_type: string | null;
          scheduled_at: string;
          modality: string | null;
          location: string | null;
          access_link: string | null;
          status: string;
          client_notified: boolean;
          notion_page_id: string | null;
          is_visible_to_client: boolean;
          created_by: string | null;
          updated_by: string | null;
          archived_at: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["hearings"]["Row"]> & {
          process_id: string;
          client_id: string;
          title: string;
          scheduled_at: string;
        };
        Update: Partial<Database["public"]["Tables"]["hearings"]["Row"]>;
        Relationships: [];
      };
      deadlines: {
        Row: WithTimestamps & {
          id: string;
          process_id: string;
          client_id: string;
          description: string;
          due_date: string;
          priority: string | null;
          status: string;
          notion_page_id: string | null;
          is_visible_to_client: boolean;
          created_by: string | null;
          updated_by: string | null;
          archived_at: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["deadlines"]["Row"]> & {
          process_id: string;
          client_id: string;
          description: string;
          due_date: string;
        };
        Update: Partial<Database["public"]["Tables"]["deadlines"]["Row"]>;
        Relationships: [];
      };
      contracts: {
        Row: WithTimestamps & {
          id: string;
          client_id: string;
          process_id: string | null;
          contract_number: string;
          service_type: string | null;
          total_value: number | null;
          down_payment: number | null;
          installments_count: number | null;
          success_fee_description: string | null;
          contract_storage_path: string | null;
          signed_at: string | null;
          status: string;
          notion_page_id: string | null;
          is_visible_to_client: boolean;
          created_by: string | null;
          updated_by: string | null;
          archived_at: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["contracts"]["Row"]> & {
          client_id: string;
          contract_number: string;
        };
        Update: Partial<Database["public"]["Tables"]["contracts"]["Row"]>;
        Relationships: [];
      };
      financial_entries: {
        Row: WithTimestamps & {
          id: string;
          client_id: string;
          contract_id: string | null;
          process_id: string | null;
          description: string;
          entry_type: string | null;
          installment_label: string | null;
          amount: number;
          due_date: string;
          paid_at: string | null;
          status: FinancialStatus;
          payment_method: string | null;
          payment_link: string | null;
          receipt_storage_path: string | null;
          notion_page_id: string | null;
          is_visible_to_client: boolean;
          created_by: string | null;
          updated_by: string | null;
          archived_at: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["financial_entries"]["Row"]> & {
          client_id: string;
          description: string;
          amount: number;
          due_date: string;
        };
        Update: Partial<Database["public"]["Tables"]["financial_entries"]["Row"]>;
        Relationships: [];
      };
      documents: {
        Row: WithTimestamps & {
          id: string;
          client_id: string;
          process_id: string | null;
          name: string;
          category: string | null;
          storage_path: string;
          uploaded_by_role: "staff" | "client";
          size_bytes: number;
          mime_type: string;
          is_confidential: boolean;
          reviewed: boolean;
          notion_page_id: string | null;
          is_visible_to_client: boolean;
          created_by: string | null;
          updated_by: string | null;
          archived_at: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["documents"]["Row"]> & {
          client_id: string;
          name: string;
          storage_path: string;
          uploaded_by_role: "staff" | "client";
          size_bytes: number;
          mime_type: string;
        };
        Update: Partial<Database["public"]["Tables"]["documents"]["Row"]>;
        Relationships: [];
      };
      messages: {
        Row: WithTimestamps & {
          id: string;
          client_id: string;
          sender_profile_id: string;
          sender_role: "client" | "staff";
          body: string;
          read_at: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["messages"]["Row"]> & {
          client_id: string;
          sender_profile_id: string;
          sender_role: "client" | "staff";
          body: string;
        };
        Update: Partial<Database["public"]["Tables"]["messages"]["Row"]>;
        Relationships: [];
      };
      notifications: {
        Row: WithTimestamps & {
          id: string;
          client_id: string | null;
          profile_id: string | null;
          title: string;
          body: string;
          category: string | null;
          read_at: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["notifications"]["Row"]> & {
          title: string;
          body: string;
        };
        Update: Partial<Database["public"]["Tables"]["notifications"]["Row"]>;
        Relationships: [];
      };
      support_requests: {
        Row: WithTimestamps & {
          id: string;
          client_id: string;
          subject: string;
          body: string;
          status: string;
          assigned_to: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["support_requests"]["Row"]> & {
          client_id: string;
          subject: string;
          body: string;
        };
        Update: Partial<Database["public"]["Tables"]["support_requests"]["Row"]>;
        Relationships: [];
      };
      ai_summaries: {
        Row: WithTimestamps & {
          id: string;
          process_update_id: string;
          client_id: string;
          model: string;
          model_version: string;
          prompt_version: string;
          technical_summary: string;
          plain_language_summary: string;
          classification: string | null;
          possible_deadline: string | null;
          sensitive_flags: string[];
          status: AiSummaryStatus;
          reviewed_by: string | null;
          reviewed_at: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["ai_summaries"]["Row"]> & {
          process_update_id: string;
          client_id: string;
          model: string;
          model_version: string;
          prompt_version: string;
          technical_summary: string;
          plain_language_summary: string;
        };
        Update: Partial<Database["public"]["Tables"]["ai_summaries"]["Row"]>;
        Relationships: [];
      };
      notion_sync_logs: {
        Row: {
          id: string;
          entity_type: string;
          notion_page_id: string | null;
          direction: string;
          status: "success" | "error" | "skipped";
          error_message: string | null;
          payload_hash: string | null;
          started_at: string;
          finished_at: string | null;
          created_by: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["notion_sync_logs"]["Row"]> & {
          entity_type: string;
          status: "success" | "error" | "skipped";
          started_at: string;
        };
        Update: Partial<Database["public"]["Tables"]["notion_sync_logs"]["Row"]>;
        Relationships: [];
      };
      access_logs: {
        Row: {
          id: string;
          profile_id: string | null;
          client_id: string | null;
          action: string;
          resource_type: string;
          resource_id: string | null;
          ip_hash: string | null;
          user_agent: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["access_logs"]["Row"]> & {
          action: string;
          resource_type: string;
        };
        Update: never;
        Relationships: [];
      };
      audit_logs: {
        Row: {
          id: string;
          actor_profile_id: string | null;
          action: string;
          entity_type: string;
          entity_id: string | null;
          before: Record<string, unknown> | null;
          after: Record<string, unknown> | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["audit_logs"]["Row"]> & {
          action: string;
          entity_type: string;
        };
        Update: never;
        Relationships: [];
      };
      auth_rate_limits: {
        Row: {
          key: string;
          attempts: number;
          window_started_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["auth_rate_limits"]["Row"]> & {
          key: string;
        };
        Update: Partial<Database["public"]["Tables"]["auth_rate_limits"]["Row"]>;
        Relationships: [];
      };
      team_members: {
        Row: WithTimestamps & {
          id: string;
          profile_id: string;
          oab: string | null;
          position: string | null;
          practice_areas: string[] | null;
          is_active: boolean;
        };
        Insert: Partial<Database["public"]["Tables"]["team_members"]["Row"]> & {
          profile_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["team_members"]["Row"]>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      consume_activation_code: {
        Args: { p_client_access_id: string; p_code_hash: string };
        Returns: boolean;
      };
      is_admin: {
        Args: Record<string, never>;
        Returns: boolean;
      };
      has_client_access: {
        Args: { p_client_id: string };
        Returns: boolean;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
