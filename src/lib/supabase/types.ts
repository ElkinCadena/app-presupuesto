export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: { id: string; full_name: string | null; currency: string; avatar_url: string | null; created_at: string }
        Insert: { id: string; full_name?: string | null; currency?: string; avatar_url?: string | null; created_at?: string }
        Update: { id?: string; full_name?: string | null; currency?: string; avatar_url?: string | null; created_at?: string }
        Relationships: []
      }
      months: {
        Row: { id: string; user_id: string; year: number; month: number; total_income: number; created_at: string }
        Insert: { id?: string; user_id: string; year: number; month: number; total_income: number; created_at?: string }
        Update: { id?: string; user_id?: string; year?: number; month?: number; total_income?: number; created_at?: string }
        Relationships: []
      }
      income_sources: {
        Row: { id: string; month_id: string; label: string; amount: number }
        Insert: { id?: string; month_id: string; label: string; amount: number }
        Update: { id?: string; month_id?: string; label?: string; amount?: number }
        Relationships: []
      }
      expense_categories: {
        Row: { id: string; user_id: string; name: string; color: string; icon: string | null }
        Insert: { id?: string; user_id: string; name: string; color: string; icon?: string | null }
        Update: { id?: string; user_id?: string; name?: string; color?: string; icon?: string | null }
        Relationships: []
      }
      expenses: {
        Row: { id: string; month_id: string; category_id: string | null; pocket_id: string | null; amount: number; description: string | null; date: string; created_at: string }
        Insert: { id?: string; month_id: string; category_id?: string | null; pocket_id?: string | null; amount: number; description?: string | null; date: string; created_at?: string }
        Update: { id?: string; month_id?: string; category_id?: string | null; pocket_id?: string | null; amount?: number; description?: string | null; date?: string; created_at?: string }
        Relationships: []
      }
      pockets: {
        Row: { id: string; month_id: string; name: string; assigned_amount: number; used_amount: number }
        Insert: { id?: string; month_id: string; name: string; assigned_amount: number; used_amount?: number }
        Update: { id?: string; month_id?: string; name?: string; assigned_amount?: number; used_amount?: number }
        Relationships: []
      }
      reminders: {
        Row: { id: string; user_id: string; name: string; amount: number | null; day_of_month: number; active: boolean }
        Insert: { id?: string; user_id: string; name: string; amount?: number | null; day_of_month: number; active?: boolean }
        Update: { id?: string; user_id?: string; name?: string; amount?: number | null; day_of_month?: number; active?: boolean }
        Relationships: []
      }
    }
    Views: { [_ in never]: never }
    Functions: { [_ in never]: never }
    Enums: { [_ in never]: never }
    CompositeTypes: { [_ in never]: never }
  }
}
