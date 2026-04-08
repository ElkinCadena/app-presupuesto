'use client';

import { type FC, useState } from 'react';
import RecordatorioModal from '@/components/features/RecordatorioModal';
import { eliminarRecordatorio, toggleRecordatorio } from '@/app/(protected)/app/recordatorios/actions';
import type { Database } from '@/lib/supabase/types';

type ReminderRow = Database['public']['Tables']['reminders']['Row'];

interface RecordatoriosClientProps {
  recordatorios: ReminderRow[];
}

const formatCOP = (value: number) =>
  new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(value);

const diasHastaProximo = (dayOfMonth: number): number => {
  const now = new Date();
  const currentDay = now.getDate();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  if (dayOfMonth >= currentDay) return dayOfMonth - currentDay;
  return daysInMonth - currentDay + dayOfMonth;
};

const RecordatoriosClient: FC<RecordatoriosClientProps> = ({ recordatorios }) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [editando, setEditando] = useState<ReminderRow | undefined>(undefined);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleOpenCrear = () => { setEditando(undefined); setModalOpen(true); };
  const handleOpenEditar = (r: ReminderRow) => { setEditando(r); setModalOpen(true); };
  const handleClose = () => { setModalOpen(false); setEditando(undefined); };

  const handleDelete = async (id: string) => {
    setDeleteError(null);
    setDeletingId(id);
    const result = await eliminarRecordatorio(id);
    setDeletingId(null);
    if ('error' in result) setDeleteError(result.error);
  };

  const handleToggle = async (r: ReminderRow) => {
    setTogglingId(r.id);
    await toggleRecordatorio(r.id, !r.active);
    setTogglingId(null);
  };

  const proximos = recordatorios.filter((r) => r.active).length;

  return (
    <>
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {proximos} recordatorio{proximos !== 1 ? 's' : ''} activo{proximos !== 1 ? 's' : ''}
        </p>
        <button
          type="button"
          onClick={handleOpenCrear}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Nuevo recordatorio
        </button>
      </div>

      {deleteError && (
        <div className="rounded-lg bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-700">
          {deleteError}
        </div>
      )}

      {recordatorios.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 p-12 text-center flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400" aria-hidden="true">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-700">Sin recordatorios</p>
            <p className="text-xs text-gray-400 mt-1">Agrega pagos recurrentes para no olvidarlos.</p>
          </div>
          <button type="button" onClick={handleOpenCrear} className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors">
            Crear recordatorio
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {recordatorios.map((r) => {
            const dias = diasHastaProximo(r.day_of_month);
            const urgente = dias <= 3;
            return (
              <div
                key={r.id}
                className={`bg-white rounded-xl border p-4 flex items-center gap-4 transition-opacity ${
                  r.active ? 'border-gray-100' : 'border-gray-100 opacity-50'
                }`}
              >
                {/* Día badge */}
                <div className={`w-10 h-10 rounded-full flex flex-col items-center justify-center flex-shrink-0 text-white text-xs font-bold ${urgente && r.active ? 'bg-red-500' : 'bg-blue-500'}`}>
                  <span>{r.day_of_month}</span>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{r.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {r.active ? (
                      dias === 0
                        ? <span className={urgente ? 'text-red-500 font-medium' : ''}>Hoy</span>
                        : <span className={urgente ? 'text-red-500 font-medium' : ''}>En {dias} día{dias !== 1 ? 's' : ''}</span>
                    ) : (
                      'Inactivo'
                    )}
                  </p>
                </div>

                {/* Monto */}
                {r.amount != null && (
                  <span className="text-sm font-semibold text-gray-900 flex-shrink-0">
                    {formatCOP(r.amount)}
                  </span>
                )}

                {/* Acciones */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => handleOpenEditar(r)}
                    className="w-7 h-7 flex items-center justify-center rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                    aria-label={`Editar ${r.name}`}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(r.id)}
                    disabled={deletingId === r.id}
                    className="w-7 h-7 flex items-center justify-center rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-40"
                    aria-label={`Eliminar ${r.name}`}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                      <path d="M10 11v6" /><path d="M14 11v6" />
                      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                    </svg>
                  </button>

                  {/* Toggle activo */}
                  <button
                    type="button"
                    role="switch"
                    aria-checked={r.active}
                    aria-label={r.active ? `Desactivar ${r.name}` : `Activar ${r.name}`}
                    disabled={togglingId === r.id}
                    onClick={() => handleToggle(r)}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 disabled:opacity-40 ${
                      r.active ? 'bg-blue-600' : 'bg-gray-200'
                    }`}
                  >
                    <span
                      className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
                        r.active ? 'translate-x-4' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <RecordatorioModal isOpen={modalOpen} onClose={handleClose} recordatorio={editando} />
    </>
  );
};

export default RecordatoriosClient;
