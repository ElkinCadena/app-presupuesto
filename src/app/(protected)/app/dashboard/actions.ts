'use server';

import { createServerSupabaseClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import type { Database } from '@/lib/supabase/types';
import { getCurrentCycle, getPreviousCycle } from '@/lib/utils';

type ExpenseCategoryRow = Database['public']['Tables']['expense_categories']['Row'];
type ExpenseRow = Database['public']['Tables']['expenses']['Row'];

type MonthRow = Database['public']['Tables']['months']['Row'];
type IncomeSourceRow = Database['public']['Tables']['income_sources']['Row'];
type MesActivoData = MonthRow & { income_sources: IncomeSourceRow[]; billing_cycle_day: number; currency: string };

// ── Obtener o crear el mes activo ─────────────────────────────────────────

export async function obtenerMesActivo(): Promise<
  { error: string } | { data: MesActivoData }
> {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'No autorizado' };

  // Leer día de corte y moneda del perfil
  const { data: profile } = await supabase
    .from('profiles')
    .select('billing_cycle_day, currency')
    .eq('id', user.id)
    .single();

  const cycleDay = profile?.billing_cycle_day ?? 1;
  const currency = (profile as { currency?: string | null } | null)?.currency ?? 'COP';

  // Calcular ciclo activo según el día de corte
  const now = new Date();
  const { year, month } = getCurrentCycle(now, cycleDay);

  const { data, error } = await supabase
    .from('months')
    .select('*')
    .eq('user_id', user.id)
    .eq('year', year)
    .eq('month', month)
    .maybeSingle();

  if (error) return { error: error.message };

  let monthRecord = data;

  if (!monthRecord) {
    const { data: newMonth, error: createError } = await supabase
      .from('months')
      .insert({ user_id: user.id, year, month, total_income: 0 })
      .select('*')
      .single();

    if (createError) return { error: createError.message };
    monthRecord = newMonth;
  }

  // Query separada para income_sources (evita depender de FK en PostgREST)
  const { data: income_sources, error: sourcesError } = await supabase
    .from('income_sources')
    .select('*')
    .eq('month_id', monthRecord.id);

  if (sourcesError) return { error: sourcesError.message };

  return { data: { ...monthRecord, income_sources: income_sources ?? [], billing_cycle_day: cycleDay, currency } as MesActivoData };
}

// ── Registrar fuentes de ingreso del mes ──────────────────────────────────

const fuenteSchema = z.object({
  label: z.string().min(1, 'El nombre es requerido').max(80),
  amount: z.number().positive('El monto debe ser mayor a 0'),
});

const ingresosSchema = z.object({
  month_id: z.string().uuid(),
  fuentes: z.array(fuenteSchema).min(1, 'Agrega al menos una fuente de ingreso'),
});

export async function registrarIngresos(
  input: z.infer<typeof ingresosSchema>
): Promise<{ error: string } | { data: { total_income: number } }> {
  const parsed = ingresosSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'No autorizado' };

  // Verificar que el mes pertenece al usuario (RLS + validación explícita)
  const { data: month } = await supabase
    .from('months')
    .select('id')
    .eq('id', parsed.data.month_id)
    .eq('user_id', user.id)
    .single();

  if (!month) return { error: 'Mes no encontrado' };

  const totalIncome = parsed.data.fuentes.reduce((sum, f) => sum + f.amount, 0);

  // Eliminar fuentes anteriores y reemplazar
  const { error: deleteError } = await supabase
    .from('income_sources')
    .delete()
    .eq('month_id', parsed.data.month_id);

  if (deleteError) return { error: deleteError.message };

  const { error: insertError } = await supabase
    .from('income_sources')
    .insert(
      parsed.data.fuentes.map((f) => ({
        month_id: parsed.data.month_id,
        label: f.label,
        amount: f.amount,
      }))
    );

  if (insertError) return { error: insertError.message };

  const { error: updateError } = await supabase
    .from('months')
    .update({ total_income: totalIncome })
    .eq('id', parsed.data.month_id);

  if (updateError) return { error: updateError.message };

  revalidatePath('/app/dashboard');
  return { data: { total_income: totalIncome } };
}

// ── Obtener categorías del usuario ────────────────────────────────────────

export async function obtenerCategorias(): Promise<
  { error: string } | { data: ExpenseCategoryRow[] }
> {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'No autorizado' };

  const { data, error } = await supabase
    .from('expense_categories')
    .select('*')
    .eq('user_id', user.id)
    .order('name');

  if (error) return { error: error.message };
  return { data: data ?? [] };
}

// ── Crear categoría por defecto si el usuario no tiene ninguna ────────────

export async function inicializarCategorias(): Promise<{ error: string } | { data: true }> {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'No autorizado' };

  const categoriasPorDefecto = [
    { user_id: user.id, name: 'Alimentación', color: '#f97316' },
    { user_id: user.id, name: 'Vivienda', color: '#8b5cf6' },
    { user_id: user.id, name: 'Deudas', color: '#7a272e' },
    { user_id: user.id, name: 'Salidas', color: '#435620' },
    { user_id: user.id, name: 'Transporte', color: '#3b82f6' },
    { user_id: user.id, name: 'Salud', color: '#ef4444' },
    { user_id: user.id, name: 'Entretenimiento', color: '#ec4899' },
    { user_id: user.id, name: 'Educación', color: '#06b6d4' },
    { user_id: user.id, name: 'Ropa', color: '#f59e0b' },
    { user_id: user.id, name: 'Otros', color: '#6b7280' },
  ];

  // Obtener las categorías existentes para no duplicarlas
  const { data: existentes } = await supabase
    .from('expense_categories')
    .select('name')
    .eq('user_id', user.id);

  const nombresExistentes = new Set(
    (existentes ?? []).map((c) => c.name.trim().toLowerCase())
  );
  const nuevas = categoriasPorDefecto.filter(
    (c) => !nombresExistentes.has(c.name.trim().toLowerCase())
  );

  if (nuevas.length === 0) return { data: true };

  const { error } = await supabase.from('expense_categories').insert(nuevas);
  if (error) return { error: error.message };
  return { data: true };
}

// ── Registrar un gasto ────────────────────────────────────────────────────

const gastoSchema = z.object({
  month_id: z.string().uuid(),
  category_id: z.string().uuid().nullable(),
  pocket_id: z.string().uuid().nullable().optional(),
  income_source_id: z.string().uuid().nullable().optional(),
  amount: z.number().positive('El monto debe ser mayor a 0'),
  description: z.string().max(200).optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida'),
});

export async function registrarGasto(
  input: z.infer<typeof gastoSchema>
): Promise<{ error: string } | { data: ExpenseRow }> {
  const parsed = gastoSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'No autorizado' };

  // Verificar que el mes pertenece al usuario
  const { data: month } = await supabase
    .from('months')
    .select('id')
    .eq('id', parsed.data.month_id)
    .eq('user_id', user.id)
    .single();

  if (!month) return { error: 'Mes no encontrado' };

  const { data, error } = await supabase
    .from('expenses')
    .insert({
      month_id: parsed.data.month_id,
      category_id: parsed.data.category_id,
      pocket_id: parsed.data.pocket_id ?? null,
      income_source_id: parsed.data.income_source_id ?? null,
      amount: parsed.data.amount,
      description: parsed.data.description ?? null,
      date: parsed.data.date,
    })
    .select()
    .single();

  if (error) return { error: error.message };

  revalidatePath('/app/dashboard');
  revalidatePath('/app/gastos');
  revalidatePath('/app/bolsillos');
  return { data };
}

// ── Eliminar un gasto ─────────────────────────────────────────────────────

export async function eliminarGasto(
  gastoId: string
): Promise<{ error: string } | { data: true }> {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'No autorizado' };

  // RLS garantiza que solo puede borrar gastos de sus propios meses
  const { error } = await supabase
    .from('expenses')
    .delete()
    .eq('id', gastoId);

  if (error) return { error: error.message };

  revalidatePath('/app/dashboard');
  revalidatePath('/app/gastos');
  return { data: true };
}

// ── Copiar ingresos del ciclo anterior ────────────────────────────────────

export async function copiarIngresosMesAnterior(
  monthId: string
): Promise<{ error: string } | { data: { total_income: number } }> {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'No autorizado' };

  // Verificar ownership del mes destino
  const { data: mesActual } = await supabase
    .from('months')
    .select('id, year, month')
    .eq('id', monthId)
    .eq('user_id', user.id)
    .single();
  if (!mesActual) return { error: 'Mes no encontrado' };

  // Mes anterior
  const prev = getPreviousCycle(mesActual.year, mesActual.month);

  const { data: mesAnterior } = await supabase
    .from('months')
    .select('id, total_income')
    .eq('user_id', user.id)
    .eq('year', prev.year)
    .eq('month', prev.month)
    .single();
  if (!mesAnterior) return { error: 'No hay un ciclo anterior con datos.' };

  // Leer fuentes del mes anterior
  const { data: fuentes, error: fuentesError } = await supabase
    .from('income_sources')
    .select('label, amount')
    .eq('month_id', mesAnterior.id);
  if (fuentesError) return { error: fuentesError.message };
  if (!fuentes || fuentes.length === 0) return { error: 'El ciclo anterior no tiene ingresos registrados.' };

  // Borrar fuentes actuales y reemplazar
  const { error: deleteError } = await supabase
    .from('income_sources')
    .delete()
    .eq('month_id', monthId);
  if (deleteError) return { error: deleteError.message };

  const { error: insertError } = await supabase
    .from('income_sources')
    .insert(fuentes.map((f) => ({ month_id: monthId, label: f.label, amount: f.amount })));
  if (insertError) return { error: insertError.message };

  const totalIncome = fuentes.reduce((sum, f) => sum + f.amount, 0);

  const { error: updateError } = await supabase
    .from('months')
    .update({ total_income: totalIncome })
    .eq('id', monthId);
  if (updateError) return { error: updateError.message };

  revalidatePath('/app/dashboard');
  return { data: { total_income: totalIncome } };
}

// ── Verificar si existe un ciclo anterior con ingresos ───────────────────

export async function tieneCicloAnteriorConIngresos(
  currentYear: number,
  currentMonth: number
): Promise<boolean> {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const prev = getPreviousCycle(currentYear, currentMonth);

  const { data: mesAnterior } = await supabase
    .from('months')
    .select('id')
    .eq('user_id', user.id)
    .eq('year', prev.year)
    .eq('month', prev.month)
    .single();
  if (!mesAnterior) return false;

  const { count } = await supabase
    .from('income_sources')
    .select('id', { count: 'exact', head: true })
    .eq('month_id', mesAnterior.id);

  return (count ?? 0) > 0;
}
