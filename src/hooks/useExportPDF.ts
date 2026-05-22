// hooks/useExportPDF.ts
'use client';

import { useState } from 'react';
import { obtenerDatosExportCompleto } from '@/app/(protected)/app/historial/actions';
import { formatCurrency } from '@/lib/utils';

interface ExportOptions {
  month: number; // 1-12
  year: number;
  currency?: string;
}

const MONTH_NAMES = [
  '', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

/** Convierte un color hex (#rrggbb o #rgb) a una tupla RGB. */
function hexToRgb(hex: string): [number, number, number] {
  const clean = (hex ?? '#6b7280').replace('#', '');
  if (clean.length === 6) {
    return [
      parseInt(clean.slice(0, 2), 16),
      parseInt(clean.slice(2, 4), 16),
      parseInt(clean.slice(4, 6), 16),
    ];
  }
  return [107, 114, 128]; // gris por defecto
}

/** Tipo auxiliar para acceder a lastAutoTable después de cada autoTable(). */
type DocWithAutoTable = { lastAutoTable: { finalY: number } };

export function useExportPDF() {
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const exportPDF = async ({ month, year, currency = 'COP' }: ExportOptions) => {
    setIsExporting(true);
    setExportError(null);

    try {
      // 1. Datos desde el servidor
      const result = await obtenerDatosExportCompleto(year, month);
      if ('error' in result) throw new Error(result.error);
      const d = result.data;

      // 2. Imports dinámicos: cargados sólo cuando el usuario hace clic
      const [jsPDFModule, autoTableModule] = await Promise.all([
        import('jspdf'),
        import('jspdf-autotable'),
      ]);
      const jsPDF = jsPDFModule.default;
      const autoTable = autoTableModule.default;

      // 3. Setup
      const doc = new jsPDF({ unit: 'mm', format: 'a4' });
      const pageW = 210;
      const lm = 14;
      const rm = 14;
      const fmt = (v: number) => formatCurrency(v, currency);
      const monthLabel = `${MONTH_NAMES[month]} ${year}`;

      // ── HEADER ──────────────────────────────────────────────────────────
      doc.setFillColor(30, 58, 95);
      doc.rect(0, 0, pageW, 30, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(18);
      doc.text('REPORTE FINANCIERO', lm, 13);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.text(monthLabel.toUpperCase(), lm, 23);

      const today = new Date().toLocaleDateString('es-CO', {
        day: '2-digit', month: 'short', year: 'numeric',
      });
      doc.setFontSize(7);
      doc.setTextColor(203, 213, 225);
      doc.text(`Generado: ${today}`, pageW - rm, 23, { align: 'right' });

      // ── KPI BOXES ───────────────────────────────────────────────────────
      const kpiY = 36;
      const kpiH = 22;
      const kpiW = (pageW - lm - rm - 8) / 3; // 3 cajas con 4 mm de separación

      const kpis = [
        {
          label: 'INGRESOS TOTALES',
          value: d.totalIncome,
          color: [17, 24, 39] as [number, number, number],
        },
        {
          label: 'GASTOS TOTALES',
          value: d.totalExpenses,
          color: [17, 24, 39] as [number, number, number],
        },
        {
          label: 'BALANCE',
          value: d.balance,
          color: (d.balance >= 0
            ? [5, 150, 105]
            : [220, 38, 38]) as [number, number, number],
        },
      ];

      kpis.forEach((kpi, i) => {
        const x = lm + i * (kpiW + 4);
        doc.setFillColor(248, 250, 252);
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.3);
        doc.roundedRect(x, kpiY, kpiW, kpiH, 2, 2, 'FD');

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6.5);
        doc.setTextColor(107, 114, 128);
        doc.text(kpi.label, x + kpiW / 2, kpiY + 7, { align: 'center' });

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(kpi.color[0], kpi.color[1], kpi.color[2]);
        doc.text(fmt(kpi.value), x + kpiW / 2, kpiY + 17, { align: 'center' });
      });

      let curY = kpiY + kpiH + 10;

      // Helper: título de sección
      const sectionTitle = (title: string, count?: number) => {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(30, 58, 95);
        doc.text(title, lm, curY);
        if (count !== undefined) {
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(7.5);
          doc.setTextColor(107, 114, 128);
          doc.text(`${count} registros`, pageW - rm, curY, { align: 'right' });
        }
        curY += 4;
      };

      // Helper: estilos comunes del encabezado de tabla
      const headStyles = {
        fillColor: [30, 58, 95] as [number, number, number],
        textColor: [255, 255, 255] as [number, number, number],
        fontSize: 8,
        fontStyle: 'bold' as const,
      };

      // ── FUENTES DE INGRESO ───────────────────────────────────────────────
      if (d.ingresosSources.length > 0) {
        sectionTitle('FUENTES DE INGRESO');
        autoTable(doc, {
          startY: curY,
          margin: { left: lm, right: rm },
          head: [['Fuente / Descripción', 'Monto']],
          body: d.ingresosSources.map((s) => [s.label, fmt(s.amount)]),
          headStyles,
          bodyStyles: { fontSize: 8 },
          columnStyles: {
            0: { cellWidth: 'auto' },
            1: { cellWidth: 40, halign: 'right' },
          },
          theme: 'grid',
        });
        curY = (doc as unknown as DocWithAutoTable).lastAutoTable.finalY + 8;
      }

      // ── TRANSACCIONES ────────────────────────────────────────────────────
      sectionTitle('TRANSACCIONES', d.gastos.length);
      autoTable(doc, {
        startY: curY,
        margin: { left: lm, right: rm },
        head: [['Fecha', 'Descripción', 'Categoría', 'Monto']],
        body: d.gastos.map((g) => [
          new Date(g.date + 'T00:00:00').toLocaleDateString('es-CO', {
            day: '2-digit',
            month: 'short',
          }),
          g.description ?? '—',
          g.categoria?.name ?? 'Sin categoría',
          fmt(g.amount),
        ]),
        headStyles,
        bodyStyles: { fontSize: 7.5 },
        columnStyles: {
          0: { cellWidth: 20 },
          1: { cellWidth: 'auto' },
          2: { cellWidth: 38, cellPadding: { top: 2, right: 2, bottom: 2, left: 7 } },
          3: { cellWidth: 34, halign: 'right' },
        },
        alternateRowStyles: { fillColor: [248, 250, 252] as [number, number, number] },
        theme: 'grid',
        didDrawCell: (data) => {
          // Punto de color de la categoría en la columna "Categoría"
          if (data.column.index === 2 && data.section === 'body') {
            const g = d.gastos[data.row.index];
            if (g?.categoria?.color) {
              const [r2, g2, b2] = hexToRgb(g.categoria.color);
              doc.setFillColor(r2, g2, b2);
              doc.rect(
                data.cell.x + 2,
                data.cell.y + (data.cell.height - 2.5) / 2,
                2.5, 2.5, 'F',
              );
            }
          }
        },
      });
      curY = (doc as unknown as DocWithAutoTable).lastAutoTable.finalY + 8;

      // ── ANÁLISIS POR CATEGORÍA ───────────────────────────────────────────
      if (curY > 220) { doc.addPage(); curY = 14; }

      sectionTitle('ANÁLISIS POR CATEGORÍA');

      const catData = d.gastosPorCategoria.map((cat) => ({
        ...cat,
        pct: d.totalExpenses > 0
          ? Math.round((cat.total / d.totalExpenses) * 100)
          : 0,
      }));

      autoTable(doc, {
        startY: curY,
        margin: { left: lm, right: rm },
        head: [['Categoría', 'Monto', '%', 'Distribución']],
        body: catData.map((c) => [c.name, fmt(c.total), `${c.pct}%`, '']),
        headStyles,
        bodyStyles: { fontSize: 8 },
        columnStyles: {
          0: { cellWidth: 50, cellPadding: { top: 2, right: 2, bottom: 2, left: 7 } },
          1: { cellWidth: 40, halign: 'right' },
          2: { cellWidth: 14, halign: 'center' },
          3: { cellWidth: 'auto' },
        },
        alternateRowStyles: { fillColor: [248, 250, 252] as [number, number, number] },
        theme: 'grid',
        didDrawCell: (data) => {
          if (data.section !== 'body') return;
          const cat = catData[data.row.index];
          if (!cat) return;

          if (data.column.index === 0) {
            // Punto de color antes del nombre de categoría
            const [r2, g2, b2] = hexToRgb(cat.color);
            doc.setFillColor(r2, g2, b2);
            doc.rect(
              data.cell.x + 2,
              data.cell.y + (data.cell.height - 2.5) / 2,
              2.5, 2.5, 'F',
            );
          }

          if (data.column.index === 3 && cat.pct > 0) {
            // Barra de progreso proporcional al porcentaje
            const [r2, g2, b2] = hexToRgb(cat.color);
            doc.setFillColor(r2, g2, b2);
            const barMaxW = data.cell.width - 6;
            const barW = Math.max(1, (cat.pct / 100) * barMaxW);
            doc.rect(
              data.cell.x + 3,
              data.cell.y + (data.cell.height - 4) / 2,
              barW, 4, 'F',
            );
          }
        },
      });

      // ── FOOTER (número de página en todas) ──────────────────────────────
      const totalPages = (
        doc as unknown as { internal: { getNumberOfPages: () => number } }
      ).internal.getNumberOfPages();

      for (let p = 1; p <= totalPages; p++) {
        doc.setPage(p);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(156, 163, 175);
        doc.text(`Página ${p} de ${totalPages}`, pageW / 2, 290, { align: 'center' });
      }

      // 4. Descarga
      doc.save(`reporte_${MONTH_NAMES[month].toLowerCase()}_${year}.pdf`);

    } catch (err) {
      const message = err instanceof Error ? err.message : 'No se pudo generar el PDF';
      setExportError(message);
      console.error('[useExportPDF]', err);
    } finally {
      setIsExporting(false);
    }
  };

  return { exportPDF, isExporting, exportError };
}
