'use server';

import { createServerSupabaseClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import type { Database } from '@/lib/supabase/types';

type ReminderRow = Database['public']['Tables']['reminders']['Row'];

// ── Schemas ───────────────────────────────────────────────────────────────

const recordatorioSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido').max(80),
  amount: z.number().positive('El monto debe ser mayor a 0').nullable(),
  day_of_month: z
    .number()
    .int()
    .min(1, 'El día debe ser entre 1 y 31')
    .max(31, 'El día debe ser entre 1 y 31'),
});

const editarSchema = recordatorioSchema.extend({ id: z.string().uuid() });

// ── Obtener recordatorios ─────────────────────────────────────────────────

export async function obtenerRecordatorios(): Promise<
  { error: string } | { data: ReminderRow[] }
> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'No autorizado' };

  const { data, error } = await supabase
    .from('reminders')
    .select('*')
    .eq('user_id', user.id)
    .order('day_of_month');

  if (error) return { error: error.message };
  return { data: data ?? [] };
}

// ── Crear recordatorio ────────────────────────────────────────────────────

export async function crearRecordatorio(
  input: z.infer<typeof recordatorioSchema>
): Promise<{ error: string } | { data: ReminderRow }> {
  const parsed = recordatorioSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'No autorizado' };

  const { data, error } = await supabase
    .from('reminders')
    .insert({
      user_id: user.id,
      name: parsed.data.name,
      amount: parsed.data.amount,
      day_of_month: parsed.data.day_of_month,
      active: true,
    })
    .select()
    .single();

  if (error) return { error: error.message };

  revalidatePath('/app/recordatorios');
  return { data };
}

// ── Editar recordatorio ───────────────────────────────────────────────────

export async function editarRecordatorio(
  input: z.infer<typeof editarSchema>
): Promise<{ error: string } | { data: true }> {
  const parsed = editarSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'No autorizado' };

  const { error } = await supabase
    .from('reminders')
    .update({
      name: parsed.data.name,
      amount: parsed.data.amount,
      day_of_month: parsed.data.day_of_month,
    })
    .eq('id', parsed.data.id)
    .eq('user_id', user.id);

  if (error) return { error: error.message };

  revalidatePath('/app/recordatorios');
  return { data: true };
}

// ── Toggle activo/inactivo ────────────────────────────────────────────────

export async function toggleRecordatorio(
  id: string,
  active: boolean
): Promise<{ error: string } | { data: true }> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'No autorizado' };

  const { error } = await supabase
    .from('reminders')
    .update({ active })
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) return { error: error.message };

  revalidatePath('/app/recordatorios');
  return { data: true };
}

// ── Eliminar recordatorio ─────────────────────────────────────────────────

export async function eliminarRecordatorio(
  id: string
): Promise<{ error: string } | { data: true }> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'No autorizado' };

  const { error } = await supabase
    .from('reminders')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) return { error: error.message };

  revalidatePath('/app/recordatorios');
  return { data: true };
}
