import { redirect, notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { obtenerDetalleMes } from '@/app/(protected)/app/historial/actions';
import DetalleMesClient from '@/components/features/DetalleMesClient';

interface PageProps {
  params: Promise<{ year: string; month: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { year, month } = await params;
  const MESES_ES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  const m = parseInt(month, 10);
  return {
    title: `${MESES_ES[m - 1] ?? month} ${year} — Historial`,
  };
}

export default async function DetalleMesPage({ params }: PageProps) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { year: yearStr, month: monthStr } = await params;
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);

  if (isNaN(year) || isNaN(month) || month < 1 || month > 12) notFound();

  const result = await obtenerDetalleMes(year, month);

  if ('error' in result) notFound();

  const mes = result.data;

  const MESES_ES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <Link
          href="/app/historial"
          className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 mb-3 transition-colors"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Volver al historial
        </Link>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
          {MESES_ES[mes.month - 1]} {mes.year}
        </h1>
        <p className="text-gray-500 mt-1 text-sm">Resumen de este mes (solo lectura)</p>
      </div>

      <DetalleMesClient mes={mes} />
    </div>
  );
}
