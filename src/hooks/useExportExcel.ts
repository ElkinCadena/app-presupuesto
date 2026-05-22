// hooks/useExportExcel.ts
import { useState } from 'react';

interface ExportOptions {
  month: number;
  year: number;
}

export function useExportExcel() {
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const exportExcel = async ({ month, year }: ExportOptions) => {
    setIsExporting(true);
    setExportError(null);

    try {
      const res = await fetch('/api/export/excel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ month, year }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? 'Error al exportar');
      }

      // Crear el link de descarga
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');

      const monthNames = [
        '', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
      ];

      a.href     = url;
      a.download = `reporte_${monthNames[month].toLowerCase()}_${year}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No se pudo exportar el reporte';
      setExportError(message);
      console.error('[useExportExcel]', err);
    } finally {
      setIsExporting(false);
    }
  };

  return { exportExcel, isExporting, exportError };
}