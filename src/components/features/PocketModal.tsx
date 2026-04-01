'use client';

import { type FC, useState, useEffect } from 'react';
import { crearBolsillo, editarBolsillo } from '@/app/(protected)/app/bolsillos/actions';
import type { Pocket } from '@/types';

const formatMiles = (val: string): string => {
  const digits = val.replace(/\D/g, '');
  if (!digits) return '';
  return new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 }).format(Number(digits));
};
const parseMiles = (val: string): number => {
  const digits = val.replace(/\D/g, '');
  return digits ? Number(digits) : 0;
};

interface PocketModalProps {
  isOpen: boolean;
  onClose: () => void;
  monthId: string;
  pocket?: Pocket;
}

const PocketModal: FC<PocketModalProps> = ({ isOpen, onClose, monthId, pocket }) => {
  const isEditing = pocket !== undefined;

  const [name, setName] = useState('');
  const [assignedAmount, setAssignedAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Poblar formulario al abrir en modo edición
  useEffect(() => {
    if (isOpen) {
      setName(pocket?.name ?? '');
      setAssignedAmount(pocket ? formatMiles(String(pocket.assignedAmount)) : '');
      setError(null);
    }
  }, [isOpen, pocket]);

  // Cerrar con Escape
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const parsedAmount = parseMiles(assignedAmount);
    if (!name.trim()) {
      setError('El nombre del bolsillo es requerido.');
      return;
    }
    if (!parsedAmount || parsedAmount <= 0) {
      setError('Ingresa un monto asignado válido mayor a 0.');
      return;
    }

    setLoading(true);

    if (isEditing && pocket) {
      const result = await editarBolsillo({
        id: pocket.id,
        name: name.trim(),
        assigned_amount: parsedAmount,
      });
      if ('error' in result) {
        setError(result.error);
        setLoading(false);
        return;
      }
    } else {
      const result = await crearBolsillo({
        month_id: monthId,
        name: name.trim(),
        assigned_amount: parsedAmount,
      });
      if ('error' in result) {
        setError(result.error);
        setLoading(false);
        return;
      }
    }

    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pocket-modal-title"
    >
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden="true" />

      {/* Panel */}
      <div className="relative bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl shadow-xl flex flex-col max-h-[90dvh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 id="pocket-modal-title" className="text-base font-semibold text-gray-900">
            {isEditing ? 'Editar bolsillo' : 'Nuevo bolsillo'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            aria-label="Cerrar"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-5 px-6 py-5 overflow-y-auto">
          {/* Nombre */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="pocket-name" className="text-sm font-medium text-gray-700">
              Nombre del bolsillo
            </label>
            <input
              id="pocket-name"
              type="text"
              maxLength={80}
              placeholder="Ej: Arriendo, Vacaciones, Mercado..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
              autoFocus
            />
          </div>

          {/* Monto asignado */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="pocket-amount" className="text-sm font-medium text-gray-700">
              Monto asignado <span className="text-gray-400 font-normal">(COP)</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">
                $
              </span>
              <input
                id="pocket-amount"
                type="text"
                inputMode="numeric"
                placeholder="0"
                value={assignedAmount}
                onChange={(e) => setAssignedAmount(formatMiles(e.target.value))}
                className="w-full pl-7 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          {/* Footer */}
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-60 transition-colors"
            >
              {loading ? 'Guardando...' : isEditing ? 'Guardar cambios' : 'Crear bolsillo'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PocketModal;
