'use server';

import { createServerSupabaseClient } from '@/lib/supabase/server';
import type { Database } from '@/lib/supabase/types';

type MonthRow = Database['public']['Tables']['months']['Row'];

export interface MesResumen {
  id: string;
  year: number;
  month: number;
  totalIncome: number;
  totalExpenses: number;
  balance: number;
}

export interface MesDetalle extends MesResumen {
  gastosPorCategoria: { name: string; color: string; total: number }[];
  gastos: {
    id: string;
    amount: number;
    description: string | null;
    date: string;
    categoria: { name: string; color: string } | null;
  }[];
}

// ── Obtener lista de meses del usuario ────────────────────────────────────

export async function obtenerHistorial(): Promise<
  { error: string } | { data: MesResumen[] }
> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'No autorizado' };

  const { data: months, error: monthsError } = await supabase
    .from('months')
    .select('*')
    .eq('user_id', user.id)
    .order('year', { ascending: false })
    .order('month', { ascending: false });

  if (monthsError) return { error: monthsError.message };
  if (!months || months.length === 0) return { data: [] };

  // Obtener suma de gastos por mes
  const monthIds = months.map((m: MonthRow) => m.id);
  const { data: expenses, error: expError } = await supabase
    .from('expenses')
    .select('month_id, amount')
    .in('month_id', monthIds);

  if (expError) return { error: expError.message };

  const expenseMap = new Map<string, number>();
  for (const exp of expenses ?? []) {
    expenseMap.set(exp.month_id, (expenseMap.get(exp.month_id) ?? 0) + exp.amount);
  }

  const data: MesResumen[] = months.map((m: MonthRow) => {
    const totalExpenses = expenseMap.get(m.id) ?? 0;
    return {
      id: m.id,
      year: m.year,
      month: m.month,
      totalIncome: m.total_income,
      totalExpenses,
      balance: m.total_income - totalExpenses,
    };
  });

  return { data };
}

// ── Obtener detalle de un mes específico ──────────────────────────────────

export async function obtenerDetalleMes(
  year: number,
  month: number
): Promise<{ error: string } | { data: MesDetalle }> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'No autorizado' };

  const { data: monthRecord, error: monthError } = await supabase
    .from('months')
    .select('*')
    .eq('user_id', user.id)
    .eq('year', year)
    .eq('month', month)
    .single();

  if (monthError || !monthRecord) return { error: 'Mes no encontrado' };

  const [expensesResult, categoriesResult] = await Promise.all([
    supabase
      .from('expenses')
      .select('*')
      .eq('month_id', monthRecord.id)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false }),
    supabase
      .from('expense_categories')
      .select('id, name, color')
      .eq('user_id', user.id),
  ]);

  if (expensesResult.error) return { error: expensesResult.error.message };

  const catMap = new Map(
    (categoriesResult.data ?? []).map((c) => [c.id, { name: c.name, color: c.color }])
  );

  const gastos = (expensesResult.data ?? []).map((g) => ({
    id: g.id,
    amount: g.amount,
    description: g.description,
    date: g.date,
    categoria: g.category_id ? (catMap.get(g.category_id) ?? null) : null,
  }));

  // Agrupar por categoría
  const catTotals = new Map<string, { name: string; color: string; total: number }>();
  for (const g of gastos) {
    if (g.categoria && g.categoria.name) {
      const key = g.categoria.name;
      const existing = catTotals.get(key);
      if (existing) {
        existing.total += g.amount;
      } else {
        catTotals.set(key, { name: g.categoria.name, color: g.categoria.color, total: g.amount });
      }
    }
  }

  const totalExpenses = gastos.reduce((sum, g) => sum + g.amount, 0);

  return {
    data: {
      id: monthRecord.id,
      year: monthRecord.year,
      month: monthRecord.month,
      totalIncome: monthRecord.total_income,
      totalExpenses,
      balance: monthRecord.total_income - totalExpenses,
      gastosPorCategoria: Array.from(catTotals.values()).sort((a, b) => b.total - a.total),
      gastos,
    },
  };
}
