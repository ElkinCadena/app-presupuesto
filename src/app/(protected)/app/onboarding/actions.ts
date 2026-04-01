'use server';

import { createServerSupabaseClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';

const onboardingSchema = z.object({
  full_name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres').max(80),
});

export async function guardarNombrePerfil(
  input: z.infer<typeof onboardingSchema>
): Promise<{ error: string } | void> {
  const parsed = onboardingSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { error: 'No hay sesión activa.' };

  const { error } = await supabase
    .from('profiles')
    .upsert({
      id: user.id,
      full_name: parsed.data.full_name,
    });

  if (error) return { error: 'No se pudo guardar el nombre. Intenta de nuevo.' };

  revalidatePath('/app/dashboard');
  redirect('/app/dashboard');
}
