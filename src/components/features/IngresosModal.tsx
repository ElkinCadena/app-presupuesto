'use client';

import { type FC, useState, useEffect } from 'react';
import { registrarIngresos } from '@/app/(protected)/app/dashboard/actions';

interface Fuente {
  id: string;
  label: string;
  amount: string;
}

interface IngresosModalProps {
  monthId: string;
  fuentesIniciales: { label: string; amount: number }[];
  onClose: () => void;
}

const formatCOP = (value: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(value);

const IngresosModal: FC<IngresosModalProps> = ({ monthId, fuentesIniciales, onClose }) => {
  const [fuentes, setFuentes] = useState<Fuente[]>(() =>
    fuentesIniciales.length > 0
      ? fuentesIniciales.map((f, i) => ({ id: String(i), label: f.label, amount: String(f.amount) }))
      : [{ id: '0', label: 'Salario', amount: '' }]
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const total = fuentes.reduce((sum, f) => sum + (parseFloat(f.amount) || 0), 0);

  const agregarFuente = () => {
    setFuentes((prev) => [...prev, { id: Date.now().toString(), label: '', amount: '' }]);
  };

  const eliminarFuente = (id: string) => {
    if (fuentes.length === 1) return;
    setFuentes((prev) => prev.filter((f) => f.id !== id));
  };

  const actualizarFuente = (id: string, campo: 'label' | 'amount', valor: string) => {
    setFuentes((prev) =>
      prev.map((f) => (f.id === id ? { ...f, [campo]: valor } : f))
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const fuentesValidas = fuentes.filter((f) => f.label.trim() && parseFloat(f.amount) > 0);
    if (fuentesValidas.length === 0) {
      setError('Agrega al menos una fuente con nombre y monto válido.');
      setLoading(false);
      return;
    }

    const result = await registrarIngresos({
      month_id: monthId,
      fuentes: fuentesValidas.map((f) => ({
        label: f.label.trim(),
        amount: parseFloat(f.amount),
      })),
    });

    if ('error' in result) {
      setError(result.error);
      setLoading(false);
      return;
    }

    onClose();
  };

  // Cerrar con Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div className="relative bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl shadow-xl flex flex-col max-h-[90dvh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 id="modal-title" className="text-base font-semibold text-gray-900">
            Ingresos del mes
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
            <p className="text-sm text-gray-500 mb-4">
              Registra todas tus fuentes de ingreso de este mes.
            </p>

            {fuentes.map((fuente, index) => (
              <div key={fuente.id} className="flex gap-2 items-start">
                <div className="flex-1 flex gap-2">
                  <input
                    type="text"
                    placeholder="Ej: Salario"
                    value={fuente.label}
                    onChange={(e) => actualizarFuente(fuente.id, 'label', e.target.value)}
                    className="flex-1 min-w-0 px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                    aria-label={`Nombre fuente ${index + 1}`}
                  />
                  <input
                    type="number"
                    placeholder="Monto"
                    value={fuente.amount}
                    min="0"
                    step="1000"
                    onChange={(e) => actualizarFuente(fuente.id, 'amount', e.target.value)}
                    className="w-32 px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                    aria-label={`Monto fuente ${index + 1}`}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => eliminarFuente(fuente.id)}
                  disabled={fuentes.length === 1}
                  aria-label="Eliminar fuente"
                  className="p-2 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-0 disabled:pointer-events-none"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                    <path d="M10 11v6M14 11v6" />
                  </svg>
                </button>
              </div>
            ))}

            <button
              type="button"
              onClick={agregarFuente}
              className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium mt-2 transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Agregar fuente
            </button>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-100 space-y-3">
            {/* Total */}
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500 font-medium">Total del mes</span>
              <span className="text-lg font-bold text-gray-900">{formatCOP(total)}</span>
            </div>

            {error && (
              <p role="alert" className="text-sm text-red-600">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading || total === 0}
              className="w-full px-4 py-2.5 rounded-lg bg-blue-600 text-white font-medium text-sm hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Guardando...' : 'Guardar ingresos'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default IngresosModal;
