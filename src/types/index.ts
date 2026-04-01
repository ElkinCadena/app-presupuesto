/**
 * Interfaces de dominio del negocio.
 * Estos tipos representan las entidades de la aplicación tal como
 * se usan en los componentes, desacoplados del schema de Supabase.
 */

export interface MonthSummary {
  id: string;
  year: number;
  month: number;
  totalIncome: number;
  totalExpenses: number;
  totalAssigned: number;
  balance: number;
}

export interface Pocket {
  id: string;
  name: string;
  assignedAmount: number;
  usedAmount: number;
  availableAmount: number;
}

export interface Expense {
  id: string;
  amount: number;
  description: string | null;
  date: string;
  pocketId: string | null;
  category: {
    id: string;
    name: string;
    color: string;
  } | null;
}

export interface Reminder {
  id: string;
  name: string;
  amount: number | null;
  dayOfMonth: number;
  active: boolean;
}
