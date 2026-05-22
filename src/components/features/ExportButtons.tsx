// components/ExportButtons.tsx
'use client';

import { useExportExcel } from '@/hooks/useExportExcel';
import { useExportPDF } from '@/hooks/useExportPDF';

interface ExportButtonsProps {
  month: number;  // 1–12
  year: number;
  currency?: string;
}

export function ExportButtons({ month, year, currency = 'COP' }: ExportButtonsProps) {
  const { exportExcel, isExporting: isExportingExcel, exportError: excelError } = useExportExcel();
  const { exportPDF,   isExporting: isExportingPDF,   exportError: pdfError   } = useExportPDF();

  const error = excelError ?? pdfError;

  return (
    <div className="flex items-center gap-2">
      {error && (
        <span className="text-xs text-red-600 mr-auto">{error}</span>
      )}

      {/* Botón Excel */}
      <button
        type="button"
        onClick={() => exportExcel({ month, year })}
        disabled={isExportingExcel || isExportingPDF}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
      >
        {isExportingExcel ? (
          <>
            <Spinner />
            Generando...
          </>
        ) : (
          <>
            <ExcelIcon />
            Excel
          </>
        )}
      </button>

      {/* Botón PDF */}
      <button
        type="button"
        onClick={() => exportPDF({ month, year, currency })}
        disabled={isExportingExcel || isExportingPDF}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
      >
        {isExportingPDF ? (
          <>
            <Spinner />
            Generando...
          </>
        ) : (
          <>
            <PdfIcon />
            PDF
          </>
        )}
      </button>
    </div>
  );
}

// ─── Íconos inline (sin dependencia extra) ───────────────────────────────────

function ExcelIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
         strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="8" y1="13" x2="16" y2="13"/>
      <line x1="8" y1="17" x2="16" y2="17"/>
      <polyline points="10 9 9 9 8 9"/>
    </svg>
  );
}

function PdfIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
         strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
    </svg>
  );
}

function Spinner() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
         strokeWidth="2" className="animate-spin">
      <circle cx="12" cy="12" r="10" strokeOpacity="0.25"/>
      <path d="M12 2a10 10 0 0 1 10 10" strokeOpacity="1"/>
    </svg>
  );
}