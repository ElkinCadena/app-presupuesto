'use client';

import { type FC, useState, useEffect } from 'react';
import { registrarGasto } from '@/app/(protected)/app/dashboard/actions';

interface Categoria {
  id: string;
  name: string;
  color: string;
}

interface GastoModalProps {
  monthId: string;
  categorias: Categoria[];
  onClose: () => void;
}

const today = () => new Date().toISOString().split('T')[0];

const GastoModal: FC<GastoModalProps> = ({ monthId, categorias, onClose }) => {
  const [categoryId, setCategoryId] = useState<string>(categorias[0]?.id ?? '');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(today());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const parsedAmount = parseFloat(amount);
    if (!parsedAmount || parsedAmount <= 0) {
      setError('Ingresa un monto válido mayor a 0.');
      return;
    }
    if (!date) {
      setError('Selecciona una fecha.');
      return;
    }

    setLoading(true);

    const result = await registrarGasto({
      month_id: monthId,
      category_id: categoryId || null,
      amount: parsedAmount,
      description: description.trim() || undefined,
      date,
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

  const categoriaActual = categorias.find((c) => c.id === categoryId);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="gasto-modal-title"
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
          <h2 id="gasto-modal-title" className="text-base font-semibold text-gray-900">
            Registrar gasto
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

          {/* Categoría */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">Categoría</label>
            {categorias.length === 0 ? (
              <p className="text-sm text-gray-400">No hay categorías disponibles.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {categorias.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategoryId(cat.id)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                      categoryId === cat.id
                        ? 'text-white border-transparent shadow-sm'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                    }`}
                    style={categoryId === cat.id ? { backgroundColor: cat.color, borderColor: cat.color } : {}}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Monto */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="monto" className="text-sm font-medium text-gray-700">
              Monto <span className="text-gray-400 font-normal">(COP)</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">$</span>
              <input
                id="monto"
                type="number"
                inputMode="decimal"
                min="1"
                step="any"
                placeholder="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full pl-7 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
          </div>

          {/* Descripción */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="descripcion" className="text-sm font-medium text-gray-700">
              Descripción <span className="text-gray-400 font-normal">(opcional)</span>
            </label>
            <input
              id="descripcion"
              type="text"
              maxLength={200}
              placeholder="Ej: Almuerzo, gasolina, Netflix..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Fecha */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="fecha" className="text-sm font-medium text-gray-700">Fecha</label>
            <input
              id="fecha"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          {/* Resumen */}
          {amount && parseFloat(amount) > 0 && (
            <div
              className="flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium text-white"
              style={{ backgroundColor: categoriaActual?.color ?? '#6b7280' }}
            >
              <span className="flex-1">{categoriaActual?.name ?? 'Sin categoría'}</span>
              <span>
                {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(parseFloat(amount))}
              </span>
            </div>
          )}

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
              {loading ? 'Guardando...' : 'Registrar gasto'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default GastoModal;
