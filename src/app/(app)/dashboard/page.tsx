import { createServerSupabaseClient } from '@/lib/supabase/server';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Dashboard — Presupuesto Personal',
};

export default async function DashboardPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">
        Hola, {user?.email}
      </h1>
      {/* PENDING: resumen del mes actual — ingresos, gastos, bolsillos */}
      {/* PENDING: gráfica de distribución */}
      {/* PENDING: accesos rápidos */}
    </div>
  );
}
