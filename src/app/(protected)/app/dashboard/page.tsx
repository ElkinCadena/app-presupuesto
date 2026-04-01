import { createServerSupabaseClient } from '@/lib/supabase/server';
import type { Database } from '@/lib/supabase/types';

type IncomeSourceRow = Database['public']['Tables']['income_sources']['Row'];
type ExpenseRow = Database['public']['Tables']['expenses']['Row'];
type ExpenseCategoryRow = Database['public']['Tables']['expense_categories']['Row'];

type GastoConCategoria = ExpenseRow & {
  categoria: { name: string; color: string } | null;
};
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { obtenerMesActivo, inicializarCategorias, obtenerCategorias } from './actions';
import DashboardClient from '@/components/features/DashboardClient';

export const metadata: Metadata = {
  title: 'Dashboard — Presupuesto Personal',
};

export default async function DashboardPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .single();

  if (!profile?.full_name) redirect('/app/onboarding');

  const mesResult = await obtenerMesActivo();
  if ('error' in mesResult) {
    return (
      <div className="rounded-xl bg-red-50 border border-red-200 p-6 text-sm text-red-700">
        <strong>Error al cargar el mes activo:</strong> {mesResult.error}
      </div>
    );
  }

  const mes = mesResult.data;

  const now = new Date();
  const monthName = now.toLocaleString('es-CO', { month: 'long' });
  const year = now.getFullYear();
  const day = now.getDate();

  // Inicializar y obtener categorías
  await inicializarCategorias();
  const categoriasResult = await obtenerCategorias();
  const categorias = 'data' in categoriasResult ? categoriasResult.data : [];
  const categoriasMap = new Map<string, ExpenseCategoryRow>(categorias.map((c) => [c.id, c]));

  // Obtener últimos 5 gastos del mes
  const { data: gastosRaw } = await supabase
    .from('expenses')
    .select('*')
    .eq('month_id', mes.id)
    .order('date', { ascending: false })
    .limit(5);

  const gastosRecientes: GastoConCategoria[] = (gastosRaw ?? []).map((g) => ({
    ...g,
    categoria: g.category_id ? (categoriasMap.get(g.category_id) ?? null) : null,
  }));

  // Total de gastos del mes completo
  const { data: todosGastos } = await supabase
    .from('expenses')
    .select('amount')
    .eq('month_id', mes.id);

  const gastosTotales = (todosGastos ?? []).reduce((sum: number, g) => sum + g.amount, 0);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <p className="text-sm text-gray-400 font-medium uppercase tracking-widest mb-1">
          {day} {monthName} {year}
        </p>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
          Hola, {profile.full_name}
        </h1>
        <p className="text-gray-500 mt-1 text-sm">
          Aquí tienes el resumen de tu mes actual.
        </p>
      </div>

      {/* Cards interactivas + banner onboarding */}
      <DashboardClient
        monthId={mes.id}
        totalIncome={mes.total_income}
        fuentesIniciales={mes.income_sources.map((f: IncomeSourceRow) => ({ label: f.label, amount: f.amount }))}
        gastosTotales={gastosTotales}
        categorias={categorias.map((c) => ({ id: c.id, name: c.name, color: c.color }))}
      />

      {/* Sección bolsillos */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-gray-800">Bolsillos</h2>
          <span className="text-xs text-gray-400">Sin bolsillos aún</span>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-8 text-center">
          <p className="text-sm text-gray-400">
            Aún no has configurado bolsillos para este mes.
          </p>
        </div>
      </div>

      {/* Sección gastos recientes */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-gray-800">Gastos recientes</h2>
          <a href="/app/gastos" className="text-xs text-blue-600 hover:underline">
            Ver todos
          </a>
        </div>
        {gastosRecientes.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-100 p-8 text-center">
            <p className="text-sm text-gray-400">No hay gastos registrados este mes.</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-100 divide-y divide-gray-50">
            {gastosRecientes.map((gasto) => (
              <div key={gasto.id} className="flex items-center gap-3 px-5 py-3.5">
                <div
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: gasto.categoria?.color ?? '#6b7280' }}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-800 truncate">
                    {gasto.description ?? gasto.categoria?.name ?? 'Sin descripción'}
                  </p>
                  <p className="text-xs text-gray-400">
                    {gasto.categoria?.name ?? 'Sin categoría'} · {new Date(gasto.date + 'T00:00:00').toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })}
                  </p>
                </div>
                <span className="text-sm font-semibold text-gray-900 flex-shrink-0">
                  {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(gasto.amount)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
