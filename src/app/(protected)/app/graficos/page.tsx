import { createServerSupabaseClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import type { Database } from '@/lib/supabase/types';
import { obtenerMesActivo, obtenerCategorias } from '@/app/(protected)/app/dashboard/actions';
import { obtenerBolsillos } from '@/app/(protected)/app/bolsillos/actions';
import GraficosClient from '@/components/features/GraficosClient';

type ExpenseRow = Database['public']['Tables']['expenses']['Row'];

export const metadata: Metadata = {
  title: 'Gráficas — Presupuesto Personal',
};

export default async function GraficosPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const mesResult = await obtenerMesActivo();
  if ('error' in mesResult) {
    return (
      <div className="rounded-xl bg-red-50 border border-red-200 p-6 text-sm text-red-700">
        <strong>Error al cargar el mes activo:</strong> {mesResult.error}
      </div>
    );
  }

  const mes = mesResult.data;

  const [categoriasResult, bolsillosResult, gastosRaw] = await Promise.all([
    obtenerCategorias(),
    obtenerBolsillos(mes.id),
    supabase
      .from('expenses')
      .select('*')
      .eq('month_id', mes.id),
  ]);

  const categorias = 'data' in categoriasResult ? categoriasResult.data : [];
  const bolsillos = 'data' in bolsillosResult ? bolsillosResult.data : [];
  const gastos = (gastosRaw.data ?? []) as ExpenseRow[];

  // Agrupar gastos por categoría
  const gastosPorCategoria = categorias
    .map((cat) => {
      const total = gastos
        .filter((g) => g.category_id === cat.id)
        .reduce((sum, g) => sum + g.amount, 0);
      return { id: cat.id, name: cat.name, color: cat.color, total };
    })
    .filter((c) => c.total > 0)
    .sort((a, b) => b.total - a.total);

  const gastosTotales = gastos.reduce((sum, g) => sum + g.amount, 0);
  const totalReservado = bolsillos.reduce((sum, p) => sum + p.availableAmount, 0);
  const disponible = mes.total_income - gastosTotales - totalReservado;

  const now = new Date();
  const monthName = now.toLocaleString('es-CO', { month: 'long' });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <p className="text-sm text-gray-400 font-medium uppercase tracking-widest mb-1">
          {monthName} {now.getFullYear()}
        </p>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Gráficas</h1>
        <p className="text-gray-500 mt-1 text-sm">
          Resumen visual de tus finanzas este mes.
        </p>
      </div>

      <GraficosClient
        totalIncome={mes.total_income}
        gastosTotales={gastosTotales}
        disponible={disponible}
        gastosPorCategoria={gastosPorCategoria}
        bolsillos={bolsillos.map((p) => ({
          name: p.name,
          assignedAmount: p.assignedAmount,
          usedAmount: p.usedAmount,
        }))}
      />
    </div>
  );
}
