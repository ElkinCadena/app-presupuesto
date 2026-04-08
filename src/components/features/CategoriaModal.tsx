'use client';

import { type FC, useState, useEffect, useRef } from 'react';
import { crearCategoria, editarCategoria } from '@/app/(protected)/app/configuracion/actions';

interface Categoria {
  id: string;
  name: string;
  color: string;
}

interface CategoriaModalProps {
  isOpen: boolean;
  onClose: () => void;
  categoria?: Categoria;
}

const COLORES_PRESET = [
  '#f97316', '#8b5cf6', '#7a272e', '#435620', '#3b82f6',
  '#ef4444', '#ec4899', '#06b6d4', '#f59e0b', '#6b7280',
  '#10b981', '#84cc16', '#6366f1', '#f43f5e', '#0ea5e9',
];

const CategoriaModal: FC<CategoriaModalProps> = ({ isOpen, onClose, categoria }) => {
  const isEditing = categoria !== undefined;
  const [name, setName] = useState('');
  const [color, setColor] = useState('#3b82f6');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setName(categoria?.name ?? '');
      setColor(categoria?.color ?? '#3b82f6');
      setError(null);
      setTimeout(() => nameRef.current?.focus(), 50);
    }
  }, [isOpen, categoria]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!name.trim()) { setError('El nombre es requerido.'); return; }
    setLoading(true);

    const result = isEditing && categoria
      ? await editarCategoria({ id: categoria.id, name: name.trim(), color })
      : await crearCategoria({ name: name.trim(), color });

    if ('error' in result) {
      setError(result.error);
      setLoading(false);
      return;
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" role="dialog" aria-modal="true" aria-labelledby="cat-modal-title">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden="true" />
      <div className="relative bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl shadow-xl flex flex-col max-h-[90dvh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 id="cat-modal-title" className="text-base font-semibold text-gray-900">
            {isEditing ? 'Editar categoría' : 'Nueva categoría'}
          </h2>
          <button type="button" onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors" aria-label="Cerrar">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5 px-6 py-5 overflow-y-auto">
          {/* Nombre */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="cat-name" className="text-sm font-medium text-gray-700">Nombre</label>
            <input
              ref={nameRef}
              id="cat-name"
              type="text"
              maxLength={60}
              placeholder="Ej: Mascota, Gym, Suscripciones..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          {/* Color */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-gray-700">Color</label>
            <div className="flex flex-wrap gap-2">
              {COLORES_PRESET.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-7 h-7 rounded-full transition-transform ${color === c ? 'scale-125 ring-2 ring-offset-1 ring-gray-400' : 'hover:scale-110'}`}
                  style={{ backgroundColor: c }}
                  aria-label={`Color ${c}`}
                />
              ))}
            </div>
            {/* Preview */}
            <div className="flex items-center gap-2 mt-1">
              <span className="w-4 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
              <span className="text-xs text-gray-500">{name || 'Vista previa'}</span>
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>
          )}

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">Cancelar</button>
            <button type="submit" disabled={loading} className="flex-1 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-60 transition-colors">
              {loading ? 'Guardando...' : isEditing ? 'Guardar cambios' : 'Crear categoría'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CategoriaModal;
