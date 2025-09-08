// Supabase Database типы
export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          role: string;
          first_name: string | null;
          last_name: string | null;
          phone: string | null;
          avatar: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          role?: string;
          first_name?: string | null;
          last_name?: string | null;
          phone?: string | null;
          avatar?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          role?: string;
          first_name?: string | null;
          last_name?: string | null;
          phone?: string | null;
          avatar?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      user_profiles: {
        Row: {
          id: string;
          user_id: string;
          first_name: string | null;
          last_name: string | null;
          phone: string | null;
          avatar: string | null;
          preferences: Record<string, unknown> | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          first_name?: string | null;
          last_name?: string | null;
          phone?: string | null;
          avatar?: string | null;
          preferences?: Record<string, unknown> | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          first_name?: string | null;
          last_name?: string | null;
          phone?: string | null;
          avatar?: string | null;
          preferences?: Record<string, unknown> | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      audit_logs: {
        Row: {
          id: string;
          user_id: string;
          user_role: string;
          action: string;
          status: string;
          resource_type: string | null;
          resource_id: string | null;
          details: Record<string, unknown> | null;
          ip_address: string | null;
          user_agent: string | null;
          metadata: Record<string, unknown> | null;
          timestamp: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          user_role: string;
          action: string;
          status: string;
          resource_type?: string | null;
          resource_id?: string | null;
          details?: Record<string, unknown> | null;
          ip_address?: string | null;
          user_agent?: string | null;
          metadata?: Record<string, unknown> | null;
          timestamp?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          user_role?: string;
          action?: string;
          status?: string;
          resource_type?: string | null;
          resource_id?: string | null;
          details?: Record<string, unknown> | null;
          ip_address?: string | null;
          user_agent?: string | null;
          metadata?: Record<string, unknown> | null;
          timestamp?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      create_simple_user: {
        Args: {
          user_email: string;
          user_password: string;
          user_first_name: string;
          user_last_name: string;
          user_role: string;
        };
        Returns: {
          id: string;
          email: string;
          role: string;
          first_name: string | null;
          last_name: string | null;
          phone: string | null;
          avatar: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
          user_profiles: {
            id: string;
            user_id: string;
            first_name: string | null;
            last_name: string | null;
            phone: string | null;
            avatar: string | null;
            preferences: Record<string, unknown> | null;
            created_at: string;
            updated_at: string;
          }[];
        };
      };
    };
    Enums: {
      [_ in never]: never;
    };
  };
}

import type { SupabaseClient } from '@supabase/supabase-js';

// Типизированный Supabase клиент
export type TypedSupabaseClient = SupabaseClient<Database>;
