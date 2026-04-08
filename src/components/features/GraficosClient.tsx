'use client';

import { type FC } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from 'recharts';

interface GastoCategoria {
  id: string;
  name: string;
  color: string;
  total: number;
}

interface BolsilloGrafica {
  name: string;
  assignedAmount: number;
  usedAmount: number;
}

interface GraficosClientProps {
  totalIncome: number;
  gastosTotales: number;
  disponible: number;
  gastosPorCategoria: GastoCategoria[];
  bolsillos: BolsilloGrafica[];
}

const formatCOP = (value: number) =>
  new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(value);

const formatAbrev = (value: number) => {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
  return `$${value}`;
};

const CustomPieTooltip = ({ active, payload }: { active?: boolean; payload?: { name: string; value: number; payload: GastoCategoria }[] }) => {
  if (!active || !payload?.length) return null;
  const item = payload[0];
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm px-3 py-2 text-xs">
      <p className="font-semibold text-gray-800">{item.name}</p>
      <p className="text-gray-500 mt-0.5">{formatCOP(item.value)}</p>
    </div>
  );
};

const CustomBarTooltip = ({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm px-3 py-2 text-xs">
      <p className="font-semibold text-gray-800 mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name}: {formatCOP(p.value)}
        </p>
      ))}
    </div>
  );
};

const GraficosClient: FC<GraficosClientProps> = ({
  totalIncome,
  gastosTotales,
  disponible,
  gastosPorCategoria,
  bolsillos,
}) => {
  const pctGastos = totalIncome > 0 ? Math.round((gastosTotales / totalIncome) * 100) : 0;

  return (
    <div className="space-y-8">
      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <p className="text-xs text-gray-400 mb-1">Ingresos</p>
          <p className="text-xl font-bold text-gray-900">{formatCOP(totalIncome)}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <p className="text-xs text-gray-400 mb-1">Gastos</p>
          <p className="text-xl font-bold text-gray-900">{formatCOP(gastosTotales)}</p>
          {totalIncome > 0 && (
            <p className="text-xs text-gray-400 mt-0.5">{pctGastos}% de los ingresos</p>
          )}
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <p className="text-xs text-gray-400 mb-1">Disponible</p>
          <p className={`text-xl font-bold ${disponible < 0 ? 'text-red-600' : 'text-emerald-600'}`}>
            {formatCOP(disponible)}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">Libre tras gastos y bolsillos</p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* PieChart — gastos por categoría */}
        <div className="bg-white rounded-xl border border-gray-100 p-6">
          <h2 className="text-sm font-semibold text-gray-800 mb-5">Gastos por categoría</h2>
          {gastosPorCategoria.length === 0 ? (
            <div className="h-64 flex items-center justify-center">
              <p className="text-sm text-gray-400">Sin gastos registrados este mes</p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={gastosPorCategoria}
                    dataKey="total"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={90}
                    paddingAngle={2}
                  >
                    {gastosPorCategoria.map((entry) => (
                      <Cell key={entry.id} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomPieTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              {/* Leyenda */}
              <ul className="grid grid-cols-2 gap-x-4 gap-y-2">
                {gastosPorCategoria.map((cat) => (
                  <li key={cat.id} className="flex items-center gap-2 min-w-0">
                    <span
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: cat.color }}
                    />
                    <span className="text-xs text-gray-600 truncate">{cat.name}</span>
                    <span className="text-xs font-medium text-gray-800 ml-auto flex-shrink-0">
                      {formatAbrev(cat.total)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* BarChart — bolsillos asignado vs usado */}
        <div className="bg-white rounded-xl border border-gray-100 p-6">
          <h2 className="text-sm font-semibold text-gray-800 mb-5">Bolsillos: asignado vs. usado</h2>
          {bolsillos.length === 0 ? (
            <div className="h-64 flex items-center justify-center">
              <p className="text-sm text-gray-400">Sin bolsillos configurados este mes</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={264}>
              <BarChart
                data={bolsillos}
                margin={{ top: 0, right: 4, left: 0, bottom: 0 }}
                barCategoryGap="30%"
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11, fill: '#9ca3af' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tickFormatter={formatAbrev}
                  tick={{ fontSize: 11, fill: '#9ca3af' }}
                  axisLine={false}
                  tickLine={false}
                  width={52}
                />
                <Tooltip content={<CustomBarTooltip />} />
                <Legend
                  iconType="circle"
                  iconSize={8}
                  formatter={(value) => (
                    <span style={{ fontSize: 11, color: '#6b7280' }}>{value}</span>
                  )}
                />
                <Bar dataKey="assignedAmount" name="Asignado" fill="#dbeafe" radius={[4, 4, 0, 0]} />
                <Bar dataKey="usedAmount" name="Usado" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
};

export default GraficosClient;
