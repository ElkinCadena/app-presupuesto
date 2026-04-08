import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { obtenerRecordatorios } from './actions';
import RecordatoriosClient from '@/components/features/RecordatoriosClient';

export const metadata: Metadata = {
  title: 'Recordatorios — Presupuesto Personal',
};

export default async function RecordatoriosPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const result = await obtenerRecordatorios();
  const recordatorios = 'data' in result ? result.data : [];

  const now = new Date();
  const monthName = now.toLocaleString('es-CO', { month: 'long' });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <p className="text-sm text-gray-400 font-medium uppercase tracking-widest mb-1">
          {monthName} {now.getFullYear()}
        </p>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Recordatorios</h1>
        <p className="text-gray-500 mt-1 text-sm">
          Pagos recurrentes y fechas importantes del mes.
        </p>
      </div>

      <RecordatoriosClient recordatorios={recordatorios} />
    </div>
  );
}
