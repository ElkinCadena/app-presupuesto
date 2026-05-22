'use client';

import { type FC } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import type { MesDetalle } from '@/app/(protected)/app/historial/actions';
import { ExportButtons } from '@/components/features/ExportButtons';
import { formatCurrency } from '@/lib/utils';

interface DetalleMesClientProps {
  mes: MesDetalle;
  currency?: string;
}

const formatFecha = (iso: string) =>
  new Date(iso + 'T00:00:00').toLocaleDateString('es-CO', {
    day: 'numeric',
    month: 'short',
  });

const DetalleMesClient: FC<DetalleMesClientProps> = ({ mes, currency = 'COP' }) => {
  const pct = mes.totalIncome > 0
    ? Math.min(100, Math.round((mes.totalExpenses / mes.totalIncome) * 100))
    : 0;
  const deficit = mes.balance < 0;
  const fmt = (v: number) => formatCurrency(v, currency);

  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: { name: string; value: number }[] }) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm px-3 py-2 text-xs">
        <p className="font-semibold text-gray-800">{payload[0].name}</p>
        <p className="text-gray-500 mt-0.5">{fmt(payload[0].value)}</p>
      </div>
    );
  };

  // Agrupar gastos por fecha
  const grouped = mes.gastos.reduce<Record<string, typeof mes.gastos>>((acc, g) => {
    if (!acc[g.date]) acc[g.date] = [];
    acc[g.date].push(g);
    return acc;
  }, {});
  const fechas = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  return (
    <div className="space-y-8">
      {/* Export toolbar */}
      <div className="flex items-center justify-end">
        <ExportButtons month={mes.month} year={mes.year} currency={currency} />
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <p className="text-xs text-gray-400 mb-1">Ingresos</p>
          <p className="text-xl font-bold text-gray-900">{fmt(mes.totalIncome)}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <p className="text-xs text-gray-400 mb-1">Gastos</p>
          <p className="text-xl font-bold text-gray-900">{fmt(mes.totalExpenses)}</p>
          {mes.totalIncome > 0 && (
            <p className="text-xs text-gray-400 mt-0.5">{pct}% de los ingresos</p>
          )}
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <p className="text-xs text-gray-400 mb-1">Balance</p>
          <p className={`text-xl font-bold ${deficit ? 'text-red-600' : 'text-emerald-600'}`}>
            {fmt(mes.balance)}
          </p>
        </div>
      </div>

      {/* Charts + gastos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* PieChart */}
        <div className="bg-white rounded-xl border border-gray-100 p-6">
          <h2 className="text-sm font-semibold text-gray-800 mb-5">Gastos por categoría</h2>
          {mes.gastosPorCategoria.length === 0 ? (
            <div className="h-48 flex items-center justify-center">
              <p className="text-sm text-gray-400">Sin gastos en este mes</p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={mes.gastosPorCategoria} dataKey="total" nameKey="name" cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={2}>
                    {mes.gastosPorCategoria.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <ul className="grid grid-cols-2 gap-x-4 gap-y-2">
                {mes.gastosPorCategoria.map((cat, i) => (
                  <li key={i} className="flex items-center gap-2 min-w-0">
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }} />
                    <span className="text-xs text-gray-600 truncate">{cat.name}</span>
                    <span className="text-xs font-medium text-gray-800 ml-auto flex-shrink-0">
                      {fmt(cat.total)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Lista de gastos */}
        <div className="bg-white rounded-xl border border-gray-100 p-6">
          <h2 className="text-sm font-semibold text-gray-800 mb-5">
            Gastos ({mes.gastos.length})
          </h2>
          {mes.gastos.length === 0 ? (
            <div className="h-48 flex items-center justify-center">
              <p className="text-sm text-gray-400">Sin gastos</p>
            </div>
          ) : (
            <div className="space-y-4 max-h-80 overflow-y-auto pr-1">
              {fechas.map((fecha) => (
                <div key={fecha}>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 capitalize">
                    {formatFecha(fecha)}
                  </p>
                  <div className="space-y-2">
                    {grouped[fecha].map((g) => (
                      <div key={g.id} className="flex items-center gap-2.5">
                        <div
                          className="w-2 h-2 rounded-full flex-shrink-0"
                          style={{ backgroundColor: g.categoria?.color ?? '#6b7280' }}
                        />
                        <span className="text-xs text-gray-700 flex-1 truncate">
                          {g.description ?? g.categoria?.name ?? 'Sin descripción'}
                        </span>
                        <span className="text-xs font-semibold text-gray-900 flex-shrink-0">
                          {fmt(g.amount)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DetalleMesClient;
