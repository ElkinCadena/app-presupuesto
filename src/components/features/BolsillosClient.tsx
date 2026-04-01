'use client';

import { type FC, useState } from 'react';
import PocketCard from '@/components/features/PocketCard';
import PocketModal from '@/components/features/PocketModal';
import GastoModal from '@/components/features/GastoModal';
import { eliminarBolsillo } from '@/app/(protected)/app/bolsillos/actions';
import type { Pocket } from '@/types';

interface Categoria {
  id: string;
  name: string;
  color: string;
}

interface BolsillosClientProps {
  bolsillos: Pocket[];
  monthId: string;
  categorias: Categoria[];
}

const BolsillosClient: FC<BolsillosClientProps> = ({ bolsillos, monthId, categorias }) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [bolsilloEditando, setBolsilloEditando] = useState<Pocket | undefined>(undefined);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [gastoModalPocket, setGastoModalPocket] = useState<Pocket | null>(null);

  const handleOpenCrear = () => {
    setBolsilloEditando(undefined);
    setModalOpen(true);
  };

  const handleOpenEditar = (pocket: Pocket) => {
    setBolsilloEditando(pocket);
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setBolsilloEditando(undefined);
  };

  const handleOpenGasto = (pocket: Pocket) => {
    setGastoModalPocket(pocket);
  };

  const handleDelete = async (id: string) => {
    setDeleteError(null);
    setDeletingId(id);
    const result = await eliminarBolsillo(id);
    setDeletingId(null);
    if ('error' in result) {
      setDeleteError(result.error);
    }
  };

  return (
    <>
      {/* Error de eliminación */}
      {deleteError && (
        <div className="rounded-lg bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-700 mb-2">
          {deleteError}
        </div>
      )}

      {bolsillos.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 p-10 text-center flex flex-col items-center gap-4">
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
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-700">Sin bolsillos este mes</p>
            <p className="text-xs text-gray-400 mt-1">
              Crea bolsillos para distribuir tu dinero en categorías o metas.
            </p>
          </div>
          <button
            type="button"
            onClick={handleOpenCrear}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            Crear primer bolsillo
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {bolsillos.map((pocket) => (
            <PocketCard
              key={pocket.id}
              pocket={pocket}
              onEdit={handleOpenEditar}
              onDelete={handleDelete}
              onSpend={handleOpenGasto}
              deleting={deletingId === pocket.id}
            />
          ))}

          {/* Tarjeta para agregar nuevo bolsillo */}
          <button
            type="button"
            onClick={handleOpenCrear}
            className="bg-white rounded-xl border border-dashed border-gray-200 p-5 flex flex-col items-center justify-center gap-2 text-gray-400 hover:border-blue-300 hover:text-blue-500 hover:bg-blue-50/30 transition-all min-h-[160px]"
            aria-label="Agregar nuevo bolsillo"
          >
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            <span className="text-xs font-medium">Nuevo bolsillo</span>
          </button>
        </div>
      )}

      <PocketModal
        isOpen={modalOpen}
        onClose={handleCloseModal}
        monthId={monthId}
        pocket={bolsilloEditando}
      />

      {gastoModalPocket && (
        <GastoModal
          monthId={monthId}
          categorias={categorias}
          bolsillos={bolsillos.map((p) => ({ id: p.id, name: p.name, availableAmount: p.availableAmount }))}
          defaultPocketId={gastoModalPocket.id}
          onClose={() => setGastoModalPocket(null)}
        />
      )}
    </>
  );
};

export default BolsillosClient;
