'use client';

import { type FC, useState } from 'react';
import IngresosModal from '@/components/features/IngresosModal';
import GastoModal from '@/components/features/GastoModal';

interface Categoria {
  id: string;
  name: string;
  color: string;
}

interface DashboardClientProps {
  monthId: string;
  totalIncome: number;
  fuentesIniciales: { label: string; amount: number }[];
  gastosTotales: number;
  categorias: Categoria[];
}

const formatCOP = (value: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(value);

const DashboardClient: FC<DashboardClientProps> = ({
  monthId,
  totalIncome,
  fuentesIniciales,
  gastosTotales,
  categorias,
}) => {
  const [modalIngresosOpen, setModalIngresosOpen] = useState(false);
  const [modalGastoOpen, setModalGastoOpen] = useState(false);
  const disponible = totalIncome - gastosTotales;

  return (
    <>
      {/* Banner onboarding — sin ingresos */}
      {totalIncome === 0 && (
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex-1">
            <p className="font-semibold text-blue-900 text-sm">Empieza registrando tus ingresos</p>
            <p className="text-blue-600 text-xs mt-0.5">
              Define cuánto dinero tienes disponible este mes para comenzar a distribuirlo.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setModalIngresosOpen(true)}
            className="flex-shrink-0 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            Registrar ingresos
          </button>
        </div>
      )}

      {/* Cards resumen */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <SummaryCard
          label="Ingresos del mes"
          value={totalIncome > 0 ? formatCOP(totalIncome) : '$0'}
          description={totalIncome > 0 ? `${fuentesIniciales.length} fuente${fuentesIniciales.length !== 1 ? 's' : ''}` : 'Sin ingresos registrados'}
          accent="blue"
          actionLabel={totalIncome > 0 ? 'Editar' : undefined}
          onAction={() => setModalIngresosOpen(true)}
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
              <polyline points="17 6 23 6 23 12" />
            </svg>
          }
        />
        <SummaryCard
          label="Gastos registrados"
          value={gastosTotales > 0 ? formatCOP(gastosTotales) : '$0'}
          description="Sin gastos este mes"
          accent="red"
          actionLabel="+ Agregar gasto"
          onAction={() => setModalGastoOpen(true)}
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polyline points="23 18 13.5 8.5 8.5 13.5 1 6" />
              <polyline points="17 18 23 18 23 12" />
            </svg>
          }
        />
        <SummaryCard
          label="Disponible"
          value={totalIncome > 0 ? formatCOP(disponible) : '$0'}
          description="Ingresos menos gastos"
          accent={disponible < 0 ? 'red' : 'green'}
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="12" y1="1" x2="12" y2="23" />
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          }
        />
      </div>

      {/* Modal ingresos */}
      {modalIngresosOpen && (
        <IngresosModal
          monthId={monthId}
          fuentesIniciales={fuentesIniciales}
          onClose={() => setModalIngresosOpen(false)}
        />
      )}

      {/* Modal gasto */}
      {modalGastoOpen && (
        <GastoModal
          monthId={monthId}
          categorias={categorias}
          onClose={() => setModalGastoOpen(false)}
        />
      )}
    </>
  );
};

/* ── Tarjeta resumen ── */
interface SummaryCardProps {
  label: string;
  value: string;
  description: string;
  accent: 'blue' | 'red' | 'green';
  icon: React.ReactNode;
  actionLabel?: string;
  onAction?: () => void;
}

const accentMap: Record<'blue' | 'red' | 'green', string> = {
  blue: 'bg-blue-50 text-blue-600',
  red: 'bg-red-50 text-red-500',
  green: 'bg-emerald-50 text-emerald-600',
};

function SummaryCard({ label, value, description, accent, icon, actionLabel, onAction }: SummaryCardProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-500">{label}</span>
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${accentMap[accent]}`}>
          {icon}
        </div>
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-xs text-gray-400 mt-0.5">{description}</p>
      </div>
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="text-xs text-blue-600 hover:underline self-start font-medium"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}

export default DashboardClient;
