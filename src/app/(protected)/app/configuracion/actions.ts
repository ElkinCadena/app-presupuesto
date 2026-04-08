'use server';

import { createServerSupabaseClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import type { Database } from '@/lib/supabase/types';

type CategoryRow = Database['public']['Tables']['expense_categories']['Row'];

// ── Perfil ────────────────────────────────────────────────────────────────

const perfilSchema = z.object({
  full_name: z.string().min(1, 'El nombre es requerido').max(80),
});

export async function actualizarPerfil(
  input: z.infer<typeof perfilSchema>
): Promise<{ error: string } | { data: true }> {
  const parsed = perfilSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'No autorizado' };

  const { error } = await supabase
    .from('profiles')
    .update({ full_name: parsed.data.full_name })
    .eq('id', user.id);

  if (error) return { error: error.message };

  revalidatePath('/app/configuracion');
  revalidatePath('/app/dashboard');
  return { data: true };
}

// ── Categorías ────────────────────────────────────────────────────────────

const categoriaSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido').max(60),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Color inválido'),
});

const editarCategoriaSchema = categoriaSchema.extend({ id: z.string().uuid() });

export async function crearCategoria(
  input: z.infer<typeof categoriaSchema>
): Promise<{ error: string } | { data: CategoryRow }> {
  const parsed = categoriaSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'No autorizado' };

  const { data, error } = await supabase
    .from('expense_categories')
    .insert({ user_id: user.id, name: parsed.data.name, color: parsed.data.color })
    .select()
    .single();

  if (error) return { error: error.message };

  revalidatePath('/app/configuracion');
  revalidatePath('/app/dashboard');
  revalidatePath('/app/gastos');
  return { data };
}

export async function editarCategoria(
  input: z.infer<typeof editarCategoriaSchema>
): Promise<{ error: string } | { data: true }> {
  const parsed = editarCategoriaSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'No autorizado' };

  const { error } = await supabase
    .from('expense_categories')
    .update({ name: parsed.data.name, color: parsed.data.color })
    .eq('id', parsed.data.id)
    .eq('user_id', user.id);

  if (error) return { error: error.message };

  revalidatePath('/app/configuracion');
  revalidatePath('/app/dashboard');
  revalidatePath('/app/gastos');
  return { data: true };
}

export async function eliminarCategoria(
  id: string
): Promise<{ error: string } | { data: true }> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'No autorizado' };

  const { error } = await supabase
    .from('expense_categories')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) return { error: error.message };

  revalidatePath('/app/configuracion');
  revalidatePath('/app/dashboard');
  revalidatePath('/app/gastos');
  return { data: true };
}

// ── Obtener el perfil ────────────────────────────────────────────────────────

export async function obtenerPerfil(): Promise<
  { error: string } | { data: { full_name: string | null } }
> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'No autorizado' };

  const { data, error } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .single();

  if (error) return { error: error.message };
  return { data: { full_name: data?.full_name ?? null } };
}

// ── Telegram — Generar token de vinculación ───────────────────────────────
//
// Nota: las columnas telegram_link_token y telegram_link_expires_at deben
// existir en la tabla profiles antes de usar estas actions.
// SQL a ejecutar en Supabase:
//   ALTER TABLE profiles
//     ADD COLUMN telegram_chat_id          bigint      UNIQUE,
//     ADD COLUMN telegram_link_token       text        UNIQUE,
//     ADD COLUMN telegram_link_expires_at  timestamptz;
// Luego regenerar tipos: npx supabase gen types typescript --project-id <ID> > src/lib/supabase/types.ts

export async function generarTokenTelegram(): Promise<
  { error: string } | { data: { token: string; expiresAt: string } }
> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'No autorizado' };

  // Token legible de 8 caracteres: ABC-1234
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const part1 = Array.from({ length: 3 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  const part2 = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  const token = `${part1}-${part2}`;

  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutos

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from('profiles') as any)
    .update({ telegram_link_token: token, telegram_link_expires_at: expiresAt })
    .eq('id', user.id);

  if (error) return { error: 'No se pudo generar el código. Intenta de nuevo.' };

  revalidatePath('/app/configuracion');
  return { data: { token, expiresAt } };
}

export async function desvincularTelegram(): Promise<{ error: string } | { data: true }> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'No autorizado' };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from('profiles') as any)
    .update({
      telegram_chat_id: null,
      telegram_link_token: null,
      telegram_link_expires_at: null,
    })
    .eq('id', user.id);

  if (error) return { error: 'No se pudo desvincular. Intenta de nuevo.' };

  revalidatePath('/app/configuracion');
  return { data: true };
}
