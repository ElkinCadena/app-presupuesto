'use client';

import { type FC, useState } from 'react';
import CategoriaModal from '@/components/features/CategoriaModal';
import TelegramVinculacion from '@/components/features/TelegramVinculacion';
import { actualizarPerfil, eliminarCategoria } from '@/app/(protected)/app/configuracion/actions';

interface Categoria {
  id: string;
  name: string;
  color: string;
}

interface ConfiguracionClientProps {
  fullName: string;
  categorias: Categoria[];
  telegramChatId?: number | null;
}

type Tab = 'perfil' | 'categorias' | 'telegram';

const ConfiguracionClient: FC<ConfiguracionClientProps> = ({
  fullName: initialName,
  categorias,
  telegramChatId = null,
}) => {
  const [tab, setTab] = useState<Tab>('perfil');

  // Perfil
  const [name, setName] = useState(initialName);
  const [savingPerfil, setSavingPerfil] = useState(false);
  const [perfilMsg, setPerfilMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // Categorías
  const [catModalOpen, setCatModalOpen] = useState(false);
  const [editandoCat, setEditandoCat] = useState<Categoria | undefined>(undefined);
  const [deletingCatId, setDeletingCatId] = useState<string | null>(null);
  const [catError, setCatError] = useState<string | null>(null);

  const handleSavePerfil = async (e: React.FormEvent) => {
    e.preventDefault();
    setPerfilMsg(null);
    setSavingPerfil(true);
    const result = await actualizarPerfil({ full_name: name });
    setSavingPerfil(false);
    if ('error' in result) {
      setPerfilMsg({ ok: false, text: result.error });
    } else {
      setPerfilMsg({ ok: true, text: 'Nombre actualizado correctamente.' });
    }
  };

  const handleDeleteCat = async (id: string) => {
    setCatError(null);
    setDeletingCatId(id);
    const result = await eliminarCategoria(id);
    setDeletingCatId(null);
    if ('error' in result) setCatError(result.error);
  };

  const tabs: { id: Tab; label: string }[] = [
    { id: 'perfil', label: 'Perfil' },
    { id: 'categorias', label: 'Categorías' },
    { id: 'telegram', label: 'Telegram' },
  ];

  return (
    <>
      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-100">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors ${
              tab === t.id
                ? 'text-blue-600 bg-blue-50 border-b-2 border-blue-600 -mb-px'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab: Perfil */}
      {tab === 'perfil' && (
        <form onSubmit={handleSavePerfil} className="max-w-sm space-y-5 pt-2">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="cfg-name" className="text-sm font-medium text-gray-700">
              Nombre completo
            </label>
            <input
              id="cfg-name"
              type="text"
              maxLength={80}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          {perfilMsg && (
            <p className={`text-sm rounded-lg px-3 py-2 ${perfilMsg.ok ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-red-50 text-red-600 border border-red-100'}`}>
              {perfilMsg.text}
            </p>
          )}

          <button
            type="submit"
            disabled={savingPerfil}
            className="px-5 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-60 transition-colors"
          >
            {savingPerfil ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </form>
      )}

      {/* Tab: Categorías */}
      {tab === 'categorias' && (
        <div className="space-y-4 pt-2">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">
              {categorias.length} categoría{categorias.length !== 1 ? 's' : ''}
            </p>
            <button
              type="button"
              onClick={() => { setEditandoCat(undefined); setCatModalOpen(true); }}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
                <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Nueva categoría
            </button>
          </div>

          {catError && (
            <div className="rounded-lg bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-700">{catError}</div>
          )}

          {categorias.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-100 p-10 text-center">
              <p className="text-sm text-gray-400">Sin categorías. Crea la primera para empezar.</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-100 divide-y divide-gray-50">
              {categorias.map((cat) => (
                <div key={cat.id} className="flex items-center gap-3 px-4 py-3">
                  <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }} />
                  <span className="text-sm text-gray-800 flex-1">{cat.name}</span>
                  <button
                    type="button"
                    onClick={() => { setEditandoCat(cat); setCatModalOpen(true); }}
                    className="w-7 h-7 flex items-center justify-center rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                    aria-label={`Editar ${cat.name}`}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteCat(cat.id)}
                    disabled={deletingCatId === cat.id}
                    className="w-7 h-7 flex items-center justify-center rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-40"
                    aria-label={`Eliminar ${cat.name}`}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                      <path d="M10 11v6" /><path d="M14 11v6" />
                      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab: Telegram */}
      {tab === 'telegram' && (
        <div className="space-y-4 pt-2 max-w-sm">
          <p className="text-sm text-gray-500 leading-relaxed">
            Vincula tu cuenta para registrar gastos directamente desde Telegram sin abrir la app.
          </p>
          <TelegramVinculacion telegramChatId={telegramChatId} />
        </div>
      )}

      <CategoriaModal
        isOpen={catModalOpen}
        onClose={() => { setCatModalOpen(false); setEditandoCat(undefined); }}
        categoria={editandoCat}
      />
    </>
  );
};

export default ConfiguracionClient;
