import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { obtenerHistorial } from './actions';
import HistorialClient from '@/components/features/HistorialClient';

export const metadata: Metadata = {
  title: 'Historial — Presupuesto Personal',
};

export default async function HistorialPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const result = await obtenerHistorial();
  const meses = 'data' in result ? result.data : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Historial</h1>
        <p className="text-gray-500 mt-1 text-sm">
          Todos tus meses registrados.
        </p>
      </div>

      <HistorialClient meses={meses} />
    </div>
  );
}
