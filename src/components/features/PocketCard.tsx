'use client';

import { type FC } from 'react';
import type { Pocket } from '@/types';

interface PocketCardProps {
  pocket: Pocket;
  onEdit: (pocket: Pocket) => void;
  onDelete: (id: string) => void;
  onSpend: (pocket: Pocket) => void;
  deleting?: boolean;
}

const formatCOP = (value: number) =>
  new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(value);

const PocketCard: FC<PocketCardProps> = ({ pocket, onEdit, onDelete, onSpend, deleting = false }) => {
  const pct =
    pocket.assignedAmount > 0
      ? Math.min(100, Math.round((pocket.usedAmount / pocket.assignedAmount) * 100))
      : 0;

  const barColor =
    pct >= 100 ? 'bg-red-500' : pct >= 75 ? 'bg-amber-400' : 'bg-emerald-500';

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5 flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <p className="font-semibold text-gray-900 text-sm leading-tight">{pocket.name}</p>
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => onEdit(pocket)}
            className="w-7 h-7 flex items-center justify-center rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
            aria-label={`Editar bolsillo ${pocket.name}`}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => onDelete(pocket.id)}
            disabled={deleting}
            className="w-7 h-7 flex items-center justify-center rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-40"
            aria-label={`Eliminar bolsillo ${pocket.name}`}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
              <path d="M10 11v6" />
              <path d="M14 11v6" />
              <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
            </svg>
          </button>
        </div>
      </div>

      {/* Barra de progreso */}
      <div className="flex flex-col gap-1.5">
        <div className="flex justify-between items-center">
          <span className="text-xs text-gray-400">Usado</span>
          <span className="text-xs font-medium text-gray-600">{pct}%</span>
        </div>
        <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${barColor}`}
            style={{ width: `${pct}%` }}
            role="progressbar"
            aria-valuenow={pct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`${pct}% utilizado del bolsillo ${pocket.name}`}
          />
        </div>
      </div>

      {/* Montos */}
      <div className="grid grid-cols-2 gap-2">
        <div className="flex flex-col">
          <span className="text-xs text-gray-400">Asignado</span>
          <span className="text-sm font-semibold text-gray-900">
            {formatCOP(pocket.assignedAmount)}
          </span>
        </div>
        <div className="flex flex-col items-end">
          <span className="text-xs text-gray-400">Disponible</span>
          <span
            className={`text-sm font-semibold ${
              pocket.availableAmount < 0 ? 'text-red-600' : 'text-emerald-600'
            }`}
          >
            {formatCOP(pocket.availableAmount)}
          </span>
        </div>
      </div>

      {/* Botón gastar */}
      <button
        type="button"
        onClick={() => onSpend(pocket)}
        disabled={pocket.availableAmount <= 0}
        className="w-full py-2 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        aria-label={`Registrar gasto del bolsillo ${pocket.name}`}
      >
        Gastar de este bolsillo
      </button>
    </div>
  );
};

export default PocketCard;
