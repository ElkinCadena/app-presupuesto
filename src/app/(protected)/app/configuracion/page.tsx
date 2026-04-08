import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { obtenerPerfil } from './actions';
import { obtenerCategorias } from '@/app/(protected)/app/dashboard/actions';
import ConfiguracionClient from '@/components/features/ConfiguracionClient';

export const metadata: Metadata = {
  title: 'Configuración — Presupuesto Personal',
};

export default async function ConfiguracionPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const [perfilResult, categoriasResult] = await Promise.all([
    obtenerPerfil(),
    obtenerCategorias(),
  ]);

  const perfil = 'data' in perfilResult ? perfilResult.data : { full_name: null };
  const categorias = 'data' in categoriasResult ? categoriasResult.data : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Configuración</h1>
        <p className="text-gray-500 mt-1 text-sm">
          Gestiona tu perfil, categorías y exportaciones.
        </p>
      </div>

      <ConfiguracionClient
        fullName={perfil.full_name ?? ''}
        categorias={categorias.map((c) => ({ id: c.id, name: c.name, color: c.color }))}
      />
    </div>
  );
}
