import { createServerSupabaseClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { obtenerMesActivo, inicializarCategorias, obtenerCategorias } from '@/app/(protected)/app/dashboard/actions';
import { obtenerBolsillos, tieneCicloAnteriorConBolsillos } from './actions';
import BolsillosClient from '@/components/features/BolsillosClient';
import { formatCurrency, getCycleLabel } from '@/lib/utils';

export const metadata: Metadata = {
  title: 'Bolsillos — Presupuesto Personal',
};

export default async function BolsillosPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const mesResult = await obtenerMesActivo();
  if ('error' in mesResult) {
    return (
      <div className="rounded-xl bg-red-50 border border-red-200 p-6 text-sm text-red-700">
        <strong>Error al cargar el mes activo:</strong> {mesResult.error}
      </div>
    );
  }

  const mes = mesResult.data;
  const cycleLabel = getCycleLabel(mes.year, mes.month, mes.billing_cycle_day);

  await inicializarCategorias();

  const [bolsillosResult, categoriasResult, hayAnterior] = await Promise.all([
    obtenerBolsillos(mes.id),
    obtenerCategorias(),
    tieneCicloAnteriorConBolsillos(mes.year, mes.month),
  ]);

  const bolsillos = 'data' in bolsillosResult ? bolsillosResult.data : [];
  const categorias = 'data' in categoriasResult ? categoriasResult.data : [];
  const currency = mes.currency;

  const totalAsignado = bolsillos.reduce((sum, p) => sum + p.assignedAmount, 0);
  const totalUsado = bolsillos.reduce((sum, p) => sum + p.usedAmount, 0);
  const totalDisponible = bolsillos.reduce((sum, p) => sum + p.availableAmount, 0);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <p className="text-sm text-gray-400 font-medium uppercase tracking-widest mb-1">
          {cycleLabel}
        </p>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Bolsillos</h1>
        <p className="text-gray-500 mt-1 text-sm">
          Distribuye tu dinero en categorías o metas para este ciclo.
        </p>
      </div>

      {/* Resumen */}
      {bolsillos.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <p className="text-xs text-gray-400 mb-1">Total asignado</p>
            <p className="text-xl font-bold text-gray-900">{formatCurrency(totalAsignado, currency)}</p>
            <p className="text-xs text-gray-400 mt-0.5">
              de {formatCurrency(mes.total_income, currency)} en ingresos
            </p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <p className="text-xs text-gray-400 mb-1">Total usado</p>
            <p className="text-xl font-bold text-gray-900">{formatCurrency(totalUsado, currency)}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <p className="text-xs text-gray-400 mb-1">Total disponible</p>
            <p className={`text-xl font-bold ${totalDisponible < 0 ? 'text-red-600' : 'text-emerald-600'}`}>
              {formatCurrency(totalDisponible, currency)}
            </p>
          </div>
        </div>
      )}

      {/* Lista de bolsillos */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-gray-800">
            {bolsillos.length > 0 ? `${bolsillos.length} bolsillo${bolsillos.length !== 1 ? 's' : ''}` : 'Mis bolsillos'}
          </h2>
        </div>
        <BolsillosClient
          bolsillos={bolsillos}
          monthId={mes.id}
          categorias={categorias.map((c) => ({ id: c.id, name: c.name, color: c.color }))}
          fuentesIngreso={mes.income_sources.map((f) => ({ id: f.id, label: f.label }))}
          hayCicloAnteriorConBolsillos={hayAnterior}
          currency={currency}
        />
      </div>
    </div>
  );
}
