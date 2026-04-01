'use server';

import { createServerSupabaseClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import type { Pocket } from '@/types';

// ── Schemas ───────────────────────────────────────────────────────────────

const crearBolsilloSchema = z.object({
  month_id: z.string().uuid(),
  name: z.string().min(1, 'El nombre es requerido').max(80),
  assigned_amount: z.number().positive('El monto asignado debe ser mayor a 0'),
});

const editarBolsilloSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1, 'El nombre es requerido').max(80).optional(),
  assigned_amount: z.number().positive('El monto asignado debe ser mayor a 0').optional(),
});

// ── Obtener bolsillos del mes con used_amount calculado ───────────────────

export async function obtenerBolsillos(
  monthId: string
): Promise<{ error: string } | { data: Pocket[] }> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'No autorizado' };

  // Verificar ownership del mes
  const { data: month } = await supabase
    .from('months')
    .select('id')
    .eq('id', monthId)
    .eq('user_id', user.id)
    .single();
  if (!month) return { error: 'Mes no encontrado' };

  const { data: pockets, error: pocketsError } = await supabase
    .from('pockets')
    .select('*')
    .eq('month_id', monthId)
    .order('name');

  if (pocketsError) return { error: pocketsError.message };
  if (!pockets || pockets.length === 0) return { data: [] };

  // Calcular used_amount leyendo los gastos asignados a estos bolsillos
  const pocketIds = pockets.map((p) => p.id);

  const { data: expenses, error: expensesError } = await supabase
    .from('expenses')
    .select('pocket_id, amount')
    .eq('month_id', monthId)
    .in('pocket_id', pocketIds);

  if (expensesError) return { error: expensesError.message };

  const usedMap = new Map<string, number>();
  for (const exp of expenses ?? []) {
    if (exp.pocket_id) {
      usedMap.set(exp.pocket_id, (usedMap.get(exp.pocket_id) ?? 0) + exp.amount);
    }
  }

  const data: Pocket[] = pockets.map((p) => {
    const usedAmount = usedMap.get(p.id) ?? 0;
    return {
      id: p.id,
      name: p.name,
      assignedAmount: p.assigned_amount,
      usedAmount,
      availableAmount: p.assigned_amount - usedAmount,
    };
  });

  return { data };
}

// ── Crear bolsillo ────────────────────────────────────────────────────────

export async function crearBolsillo(
  input: z.infer<typeof crearBolsilloSchema>
): Promise<{ error: string } | { data: Pocket }> {
  const parsed = crearBolsilloSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'No autorizado' };

  // Verificar ownership del mes
  const { data: month } = await supabase
    .from('months')
    .select('id')
    .eq('id', parsed.data.month_id)
    .eq('user_id', user.id)
    .single();
  if (!month) return { error: 'Mes no encontrado' };

  const { data, error } = await supabase
    .from('pockets')
    .insert({
      month_id: parsed.data.month_id,
      name: parsed.data.name,
      assigned_amount: parsed.data.assigned_amount,
    })
    .select()
    .single();

  if (error) return { error: error.message };

  revalidatePath('/app/bolsillos');
  revalidatePath('/app/dashboard');

  return {
    data: {
      id: data.id,
      name: data.name,
      assignedAmount: data.assigned_amount,
      usedAmount: 0,
      availableAmount: data.assigned_amount,
    },
  };
}

// ── Editar bolsillo ───────────────────────────────────────────────────────

export async function editarBolsillo(
  input: z.infer<typeof editarBolsilloSchema>
): Promise<{ error: string } | { data: true }> {
  const parsed = editarBolsilloSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'No autorizado' };

  // Verificar ownership via el mes del bolsillo
  const { data: pocket } = await supabase
    .from('pockets')
    .select('id, month_id')
    .eq('id', parsed.data.id)
    .single();
  if (!pocket) return { error: 'Bolsillo no encontrado' };

  const { data: month } = await supabase
    .from('months')
    .select('id')
    .eq('id', pocket.month_id)
    .eq('user_id', user.id)
    .single();
  if (!month) return { error: 'Bolsillo no encontrado' };

  const updatePayload: { name?: string; assigned_amount?: number } = {};
  if (parsed.data.name !== undefined) updatePayload.name = parsed.data.name;
  if (parsed.data.assigned_amount !== undefined)
    updatePayload.assigned_amount = parsed.data.assigned_amount;

  const { error } = await supabase
    .from('pockets')
    .update(updatePayload)
    .eq('id', parsed.data.id);

  if (error) return { error: error.message };

  revalidatePath('/app/bolsillos');
  revalidatePath('/app/dashboard');
  return { data: true };
}

// ── Eliminar bolsillo ─────────────────────────────────────────────────────

export async function eliminarBolsillo(
  bolsilloId: string
): Promise<{ error: string } | { data: true }> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'No autorizado' };

  // Verificar ownership via el mes del bolsillo
  const { data: pocket } = await supabase
    .from('pockets')
    .select('id, month_id')
    .eq('id', bolsilloId)
    .single();
  if (!pocket) return { error: 'Bolsillo no encontrado' };

  const { data: month } = await supabase
    .from('months')
    .select('id')
    .eq('id', pocket.month_id)
    .eq('user_id', user.id)
    .single();
  if (!month) return { error: 'Bolsillo no encontrado' };

  // Cascade: eliminar gastos vinculados al bolsillo
  const { error: expensesError } = await supabase
    .from('expenses')
    .delete()
    .eq('pocket_id', bolsilloId);
  if (expensesError) return { error: expensesError.message };

  const { error } = await supabase.from('pockets').delete().eq('id', bolsilloId);
  if (error) return { error: error.message };

  revalidatePath('/app/bolsillos');
  revalidatePath('/app/dashboard');
  revalidatePath('/app/gastos');
  return { data: true };
}
