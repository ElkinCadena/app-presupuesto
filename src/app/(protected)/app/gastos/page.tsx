import { createServerSupabaseClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import type { Database } from '@/lib/supabase/types';
import { obtenerMesActivo, inicializarCategorias, obtenerCategorias } from '@/app/(protected)/app/dashboard/actions';
import { obtenerBolsillos } from '@/app/(protected)/app/bolsillos/actions';
import GastosClient, { type GastoResumen } from '@/components/features/GastosClient';

type ExpenseRow = Database['public']['Tables']['expenses']['Row'];
type ExpenseCategoryRow = Database['public']['Tables']['expense_categories']['Row'];

export const metadata: Metadata = {
  title: 'Gastos — Presupuesto Personal',
};

export default async function GastosPage() {
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

  await inicializarCategorias();

  const [categoriasResult, bolsillosResult, gastosRaw] = await Promise.all([
    obtenerCategorias(),
    obtenerBolsillos(mes.id),
    supabase
      .from('expenses')
      .select('*')
      .eq('month_id', mes.id)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false }),
  ]);

  const categorias = 'data' in categoriasResult ? categoriasResult.data : [];
  const bolsillos = 'data' in bolsillosResult ? bolsillosResult.data : [];

  const categoriasMap = new Map<string, ExpenseCategoryRow>(
    categorias.map((c) => [c.id, c])
  );
  const pocketMap = new Map(bolsillos.map((p) => [p.id, p.name]));

  const gastos: GastoResumen[] = ((gastosRaw.data ?? []) as ExpenseRow[]).map((g) => ({
    id: g.id,
    amount: g.amount,
    description: g.description,
    date: g.date,
    pocket_id: g.pocket_id,
    pocketName: g.pocket_id ? (pocketMap.get(g.pocket_id) ?? null) : null,
    categoria: g.category_id
      ? (categoriasMap.get(g.category_id) ?? null)
      : null,
  }));

  const gastosTotales = gastos.reduce((sum, g) => sum + g.amount, 0);

  const now = new Date();
  const monthName = now.toLocaleString('es-CO', { month: 'long' });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <p className="text-sm text-gray-400 font-medium uppercase tracking-widest mb-1">
          {monthName} {now.getFullYear()}
        </p>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Gastos</h1>
        <p className="text-gray-500 mt-1 text-sm">
          Todos los gastos registrados este mes.
        </p>
      </div>

      <GastosClient
        gastos={gastos}
        monthId={mes.id}
        categorias={categorias.map((c) => ({ id: c.id, name: c.name, color: c.color }))}
        bolsillos={bolsillos.map((p) => ({ id: p.id, name: p.name, availableAmount: p.availableAmount }))}
        gastosTotales={gastosTotales}
      />
    </div>
  );
}
