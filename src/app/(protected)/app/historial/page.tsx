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

  const [historialResult, profileResult] = await Promise.all([
    obtenerHistorial(),
    supabase.from('profiles').select('currency').eq('id', user.id).single(),
  ]);

  const meses = 'data' in historialResult ? historialResult.data : [];
  const currency = (profileResult.data as { currency?: string | null } | null)?.currency ?? 'COP';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Historial</h1>
        <p className="text-gray-500 mt-1 text-sm">
          Todos tus meses registrados.
        </p>
      </div>

      <HistorialClient meses={meses} currency={currency} />
    </div>
  );
}
