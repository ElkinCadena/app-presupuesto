'use client';

import { type FC, useState, useEffect, useRef } from 'react';
import { crearRecordatorio, editarRecordatorio } from '@/app/(protected)/app/recordatorios/actions';
import type { Database } from '@/lib/supabase/types';

type ReminderRow = Database['public']['Tables']['reminders']['Row'];

interface RecordatorioModalProps {
  isOpen: boolean;
  onClose: () => void;
  recordatorio?: ReminderRow;
}

const formatMiles = (val: string): string => {
  const digits = val.replace(/\D/g, '');
  if (!digits) return '';
  return new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 }).format(Number(digits));
};
const parseMiles = (val: string): number => {
  const digits = val.replace(/\D/g, '');
  return digits ? Number(digits) : 0;
};

const RecordatorioModal: FC<RecordatorioModalProps> = ({ isOpen, onClose, recordatorio }) => {
  const isEditing = recordatorio !== undefined;

  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [dayOfMonth, setDayOfMonth] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setName(recordatorio?.name ?? '');
      setAmount(recordatorio?.amount ? formatMiles(String(recordatorio.amount)) : '');
      setDayOfMonth(recordatorio?.day_of_month ? String(recordatorio.day_of_month) : '');
      setError(null);
      setTimeout(() => nameRef.current?.focus(), 50);
    }
  }, [isOpen, recordatorio]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const parsedDay = parseInt(dayOfMonth, 10);
    if (!name.trim()) { setError('El nombre es requerido.'); return; }
    if (isNaN(parsedDay) || parsedDay < 1 || parsedDay > 31) {
      setError('Ingresa un día válido entre 1 y 31.'); return;
    }

    setLoading(true);

    const payload = {
      name: name.trim(),
      amount: amount ? parseMiles(amount) : null,
      day_of_month: parsedDay,
    };

    const result = isEditing && recordatorio
      ? await editarRecordatorio({ id: recordatorio.id, ...payload })
      : await crearRecordatorio(payload);

    if ('error' in result) {
      setError(result.error);
      setLoading(false);
      return;
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="recordatorio-modal-title"
    >
      <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden="true" />

      <div className="relative bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl shadow-xl flex flex-col max-h-[90dvh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 id="recordatorio-modal-title" className="text-base font-semibold text-gray-900">
            {isEditing ? 'Editar recordatorio' : 'Nuevo recordatorio'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            aria-label="Cerrar"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-5 px-6 py-5 overflow-y-auto">
          {/* Nombre */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="rec-name" className="text-sm font-medium text-gray-700">Nombre</label>
            <input
              ref={nameRef}
              id="rec-name"
              type="text"
              maxLength={80}
              placeholder="Ej: Arriendo, Netflix, Seguro..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          {/* Día del mes */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="rec-day" className="text-sm font-medium text-gray-700">
              Día del mes
            </label>
            <input
              id="rec-day"
              type="number"
              inputMode="numeric"
              min={1}
              max={31}
              placeholder="Ej: 5"
              value={dayOfMonth}
              onChange={(e) => setDayOfMonth(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          {/* Monto (opcional) */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="rec-amount" className="text-sm font-medium text-gray-700">
              Monto <span className="text-gray-400 font-normal">(opcional)</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">$</span>
              <input
                id="rec-amount"
                type="text"
                inputMode="numeric"
                placeholder="0"
                value={amount}
                onChange={(e) => setAmount(formatMiles(e.target.value))}
                className="w-full pl-7 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={loading} className="flex-1 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-60 transition-colors">
              {loading ? 'Guardando...' : isEditing ? 'Guardar cambios' : 'Crear recordatorio'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RecordatorioModal;
