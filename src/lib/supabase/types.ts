/**
 * Tipos generados automáticamente desde el schema de Supabase.
 * Regenerar con:
 *   npx supabase gen types typescript --project-id <PROJECT_ID> > src/lib/supabase/types.ts
 *
 * No editar manualmente este archivo.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

// PENDING: Reemplazar con los tipos generados tras crear el schema en Supabase
export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          currency: string;
          avatar_url: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          currency?: string;
          avatar_url?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string | null;
          currency?: string;
          avatar_url?: string | null;
          created_at?: string;
        };
      };
      months: {
        Row: {
          id: string;
          user_id: string;
          year: number;
          month: number;
          total_income: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          year: number;
          month: number;
          total_income: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          year?: number;
          month?: number;
          total_income?: number;
          created_at?: string;
        };
      };
      income_sources: {
        Row: {
          id: string;
          month_id: string;
          label: string;
          amount: number;
        };
        Insert: {
          id?: string;
          month_id: string;
          label: string;
          amount: number;
        };
        Update: {
          id?: string;
          month_id?: string;
          label?: string;
          amount?: number;
        };
      };
      expense_categories: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          color: string;
          icon: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          color: string;
          icon?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          color?: string;
          icon?: string | null;
        };
      };
      expenses: {
        Row: {
          id: string;
          month_id: string;
          category_id: string | null;
          amount: number;
          description: string | null;
          date: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          month_id: string;
          category_id?: string | null;
          amount: number;
          description?: string | null;
          date: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          month_id?: string;
          category_id?: string | null;
          amount?: number;
          description?: string | null;
          date?: string;
          created_at?: string;
        };
      };
      pockets: {
        Row: {
          id: string;
          month_id: string;
          name: string;
          assigned_amount: number;
          used_amount: number;
        };
        Insert: {
          id?: string;
          month_id: string;
          name: string;
          assigned_amount: number;
          used_amount?: number;
        };
        Update: {
          id?: string;
          month_id?: string;
          name?: string;
          assigned_amount?: number;
          used_amount?: number;
        };
      };
      reminders: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          amount: number | null;
          day_of_month: number;
          active: boolean;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          amount?: number | null;
          day_of_month: number;
          active?: boolean;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          amount?: number | null;
          day_of_month?: number;
          active?: boolean;
        };
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}
