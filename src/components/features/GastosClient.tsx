'use client';

import { type FC, useState } from 'react';
import GastoModal from '@/components/features/GastoModal';
import { eliminarGasto } from '@/app/(protected)/app/dashboard/actions';

interface Categoria {
  id: string;
  name: string;
  color: string;
}

interface BolsilloResumen {
  id: string;
  name: string;
  availableAmount: number;
}

export interface GastoResumen {
  id: string;
  amount: number;
  description: string | null;
  date: string;
  pocket_id: string | null;
  categoria: { name: string; color: string } | null;
  pocketName: string | null;
}

interface GastosClientProps {
  gastos: GastoResumen[];
  monthId: string;
  categorias: Categoria[];
  bolsillos: BolsilloResumen[];
  gastosTotales: number;
}

const formatCOP = (value: number) =>
  new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(value);

const GastosClient: FC<GastosClientProps> = ({
  gastos,
  monthId,
  categorias,
  bolsillos,
  gastosTotales,
}) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    setDeleteError(null);
    setDeletingId(id);
    const result = await eliminarGasto(id);
    setDeletingId(null);
    if ('error' in result) {
      setDeleteError(result.error);
    }
  };

  // Agrupar gastos por fecha
  const grouped = gastos.reduce<Record<string, GastoResumen[]>>((acc, g) => {
    const key = g.date;
    if (!acc[key]) acc[key] = [];
    acc[key].push(g);
    return acc;
  }, {});

  const fechasOrdenadas = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  const formatFecha = (iso: string) =>
    new Date(iso + 'T00:00:00').toLocaleDateString('es-CO', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });

  return (
    <>
      {/* Header de acción */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">
            {gastos.length} gasto{gastos.length !== 1 ? 's' : ''} ·{' '}
            <span className="font-semibold text-gray-900">{formatCOP(gastosTotales)}</span>
          </p>
        </div>
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Agregar gasto
        </button>
      </div>

      {/* Error de eliminación */}
      {deleteError && (
        <div className="rounded-lg bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-700">
          {deleteError}
        </div>
      )}

      {/* Lista agrupada por fecha */}
      {gastos.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 p-12 text-center flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-gray-400"
              aria-hidden="true"
            >
              <line x1="12" y1="1" x2="12" y2="23" />
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-700">Sin gastos este mes</p>
            <p className="text-xs text-gray-400 mt-1">
              Registra tu primer gasto para comenzar a hacer seguimiento.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            Registrar gasto
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {fechasOrdenadas.map((fecha) => (
            <div key={fecha}>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-1 capitalize">
                {formatFecha(fecha)}
              </p>
              <div className="bg-white rounded-xl border border-gray-100 divide-y divide-gray-50">
                {grouped[fecha].map((gasto) => (
                  <div key={gasto.id} className="flex items-center gap-3 px-5 py-3.5">
                    {/* Dot de color */}
                    <div
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: gasto.categoria?.color ?? '#6b7280' }}
                    />

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">
                        {gasto.description ?? gasto.categoria?.name ?? 'Sin descripción'}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {gasto.categoria?.name ?? 'Sin categoría'}
                        {gasto.pocketName && (
                          <span className="ml-1.5 inline-flex items-center gap-1 text-blue-500">
                            {'· '}
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>
                            {gasto.pocketName}
                          </span>
                        )}
                      </p>
                    </div>

                    {/* Monto */}
                    <span className="text-sm font-semibold text-gray-900 flex-shrink-0">
                      {formatCOP(gasto.amount)}
                    </span>

                    {/* Botón eliminar */}
                    <button
                      type="button"
                      onClick={() => handleDelete(gasto.id)}
                      disabled={deletingId === gasto.id}
                      className="w-7 h-7 flex items-center justify-center rounded-md text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-40 flex-shrink-0"
                      aria-label="Eliminar gasto"
                    >
                      {deletingId === gasto.id ? (
                        <svg
                          width="13"
                          height="13"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          className="animate-spin"
                          aria-hidden="true"
                        >
                          <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                        </svg>
                      ) : (
                        <svg
                          width="13"
                          height="13"
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
                      )}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {modalOpen && (
        <GastoModal
          monthId={monthId}
          categorias={categorias}
          bolsillos={bolsillos}
          onClose={() => setModalOpen(false)}
        />
      )}
    </>
  );
};

export default GastosClient;
