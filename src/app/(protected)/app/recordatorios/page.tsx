import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { obtenerRecordatorios } from './actions';
import { obtenerMesActivo, obtenerCategorias } from '@/app/(protected)/app/dashboard/actions';
import { obtenerBolsillos } from '@/app/(protected)/app/bolsillos/actions';
import { getCycleLabel } from '@/lib/utils';
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

  const [recordatoriosResult, mesResult, categoriasResult] = await Promise.all([
    obtenerRecordatorios(),
    obtenerMesActivo(),
    obtenerCategorias(),
  ]);

  const recordatorios = 'data' in recordatoriosResult ? recordatoriosResult.data : [];
  const mes = 'data' in mesResult ? mesResult.data : null;
  const categorias = 'data' in categoriasResult ? categoriasResult.data : [];

  const bolsillos = mes
    ? (() => {
        return obtenerBolsillos(mes.id).then((r) => ('data' in r ? r.data : []));
      })()
    : Promise.resolve([]);

  const resolvedBolsillos = await bolsillos;

  const cycleLabel = mes
    ? getCycleLabel(mes.year, mes.month, mes.billing_cycle_day)
    : new Date().toLocaleString('es-CO', { month: 'long' });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <p className="text-sm text-gray-400 font-medium uppercase tracking-widest mb-1">
          {cycleLabel}
        </p>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Recordatorios</h1>
        <p className="text-gray-500 mt-1 text-sm">
          Pagos recurrentes y fechas importantes del ciclo.
        </p>
      </div>

      <RecordatoriosClient
        recordatorios={recordatorios}
        monthId={mes?.id ?? ''}
        categorias={categorias.map((c) => ({ id: c.id, name: c.name, color: c.color }))}
        bolsillos={resolvedBolsillos.map((p) => ({ id: p.id, name: p.name, availableAmount: p.availableAmount }))}
        fuentesIngreso={(mes?.income_sources ?? []).map((f) => ({ id: f.id, label: f.label }))}
        currency={mes?.currency ?? 'COP'}
      />
    </div>
  );
}
