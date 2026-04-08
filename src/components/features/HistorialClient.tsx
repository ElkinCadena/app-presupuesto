'use client';

import { type FC } from 'react';
import Link from 'next/link';
import type { MesResumen } from '@/app/(protected)/app/historial/actions';

interface HistorialClientProps {
  meses: MesResumen[];
}

const formatCOP = (value: number) =>
  new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(value);

const MESES_ES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

const HistorialClient: FC<HistorialClientProps> = ({ meses }) => {
  if (meses.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-100 p-12 text-center flex flex-col items-center gap-4">
        <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400" aria-hidden="true">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
        </div>
        <div>
          <p className="text-sm font-medium text-gray-700">Sin historial aún</p>
          <p className="text-xs text-gray-400 mt-1">
            Cuando registres datos de otros meses aparecerán aquí.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {meses.map((mes) => {
        const pctGastos = mes.totalIncome > 0
          ? Math.min(100, Math.round((mes.totalExpenses / mes.totalIncome) * 100))
          : 0;
        const deficit = mes.balance < 0;

        return (
          <Link
            key={mes.id}
            href={`/app/historial/${mes.year}/${mes.month}`}
            className="bg-white rounded-xl border border-gray-100 p-5 flex flex-col gap-4 hover:border-blue-200 hover:shadow-sm transition-all"
          >
            {/* Mes y año */}
            <div className="flex items-center justify-between">
              <p className="font-semibold text-gray-900 text-sm">
                {MESES_ES[mes.month - 1]} {mes.year}
              </p>
              {deficit && (
                <span className="text-xs font-medium text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
                  Déficit
                </span>
              )}
            </div>

            {/* Barra de gastos */}
            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-xs text-gray-400">
                <span>Gastos</span>
                <span>{pctGastos}%</span>
              </div>
              <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                <div
                  className={`h-full rounded-full ${pctGastos >= 100 ? 'bg-red-500' : pctGastos >= 75 ? 'bg-amber-400' : 'bg-emerald-500'}`}
                  style={{ width: `${pctGastos}%` }}
                />
              </div>
            </div>

            {/* Montos */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <p className="text-gray-400">Ingresos</p>
                <p className="font-semibold text-gray-900 mt-0.5">{formatCOP(mes.totalIncome)}</p>
              </div>
              <div>
                <p className="text-gray-400">Gastos</p>
                <p className="font-semibold text-gray-900 mt-0.5">{formatCOP(mes.totalExpenses)}</p>
              </div>
            </div>

            {/* Balance */}
            <div className={`text-xs font-semibold ${deficit ? 'text-red-600' : 'text-emerald-600'}`}>
              Balance: {formatCOP(mes.balance)}
            </div>
          </Link>
        );
      })}
    </div>
  );
};

export default HistorialClient;
