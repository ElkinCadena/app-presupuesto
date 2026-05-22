// app/api/export/excel/route.ts
import { NextResponse } from 'next/server';
import ExcelJS from 'exceljs';
import JSZip from 'jszip';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import path from 'path';
import fs from 'fs';

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface ExportRequest {
  month: number;   // 1–12
  year: number;
  userId?: string; // opcional si manejas auth por session
}

interface ExpenseRow {
  id: string;
  date: string;
  description: string | null;
  amount: number;
  category_id: string | null;
}

interface CategoryRow {
  id: string;
  name: string;
  color: string;
}

const MONTH_NAMES = [
  '', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

// ─── Handler ──────────────────────────────────────────────────────────────────

export async function POST(req: Request) {
  try {
    const body: ExportRequest = await req.json();
    const { month, year } = body;

    if (!month || !year) {
      return NextResponse.json({ error: 'month y year son requeridos' }, { status: 400 });
    }

    // 1. Obtener sesión del usuario
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // 2. Obtener registro del mes
    const { data: monthRecord, error: monthError } = await supabase
      .from('months')
      .select('id, total_income')
      .eq('user_id', user.id)
      .eq('year', year)
      .eq('month', month)
      .single();

    if (monthError || !monthRecord) {
      return NextResponse.json({ error: 'Mes no encontrado' }, { status: 404 });
    }

    // 3. Consultar gastos, categorías e ingresos del mes en paralelo
    const [expensesResult, categoriesResult, incomesResult] = await Promise.all([
      supabase
        .from('expenses')
        .select('id, date, description, amount, category_id')
        .eq('month_id', monthRecord.id)
        .order('date', { ascending: false }),
      supabase
        .from('expense_categories')
        .select('id, name, color')
        .eq('user_id', user.id),
      supabase
        .from('income_sources')
        .select('id, label, amount, created_at')
        .eq('month_id', monthRecord.id)
        .order('created_at', { ascending: true }),
    ]);

    if (expensesResult.error) throw expensesResult.error;

    const transactions: ExpenseRow[] = expensesResult.data ?? [];
    const catMap = new Map<string, CategoryRow>(
      (categoriesResult.data ?? []).map((c: CategoryRow) => [c.id, c])
    );
    const incomeSources = incomesResult.data ?? [];

    // Calcular totales para inyectar en Análisis
    const totalIncome = incomeSources.reduce((s, r) => s + r.amount, 0);
    const totalExpenses = transactions.reduce((s, r) => s + r.amount, 0);
    const balance = totalIncome - totalExpenses;

    // Totales por categoría (para Análisis)
    const categorySums = new Map<string, number>();
    for (const tx of transactions) {
      const catName = tx.category_id ? (catMap.get(tx.category_id)?.name ?? null) : null;
      if (catName) categorySums.set(catName, (categorySums.get(catName) ?? 0) + tx.amount);
    }

    // 4. Cargar plantilla base desde /public/templates/
    const templatePath = path.join(process.cwd(), 'public', 'templates', 'reporte_financiero_plantilla.xlsx');

    if (!fs.existsSync(templatePath)) {
      return NextResponse.json(
        { error: 'Plantilla no encontrada. Asegúrate de copiar reporte_financiero_plantilla.xlsx en /public/templates/' },
        { status: 500 }
      );
    }

    const wb = new ExcelJS.Workbook();
    await wb.xlsx.readFile(templatePath);

    // Forzar recálculo al abrir en Excel (garantiza que las fórmulas reflejen los datos nuevos)
    wb.calcProperties = { fullCalcOnLoad: true };

    // 5. Inyectar transacciones (ingresos + gastos)
    const wsTx = wb.getWorksheet('Transacciones');
    if (!wsTx) throw new Error('Hoja Transacciones no encontrada en la plantilla');

    // Limpia filas de datos existentes (7 → 500 cubre cualquier volumen razonable)
    for (let r = 7; r <= 500; r++) {
      const row = wsTx.getRow(r);
      row.eachCell({ includeEmpty: true }, (cell) => { cell.value = null; });
    }

    // Estilos base para filas de datos
    const fillAlt   = { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FFEAF4FF' } };
    const fillWhite = { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FFFFFFFF' } };

    let rowNum = 7;

    // — Primero las filas de ingreso (tipo "Ingreso" → SUMIF las suma en C2)
    for (const src of incomeSources) {
      const row = wsTx.getRow(rowNum);
      const bg = (rowNum - 7) % 2 === 0 ? fillAlt : fillWhite;
      const values = [
        new Date(src.created_at.split('T')[0] + 'T00:00:00'), // A: Fecha
        'Ingreso',                                              // B: Tipo
        src.label,                                             // C: Descripción
        src.amount,                                            // D: Monto
        'Ingreso',                                             // E: Categoría
        '',                                                    // F: Método pago
        '',                                                    // G: Notas
      ];
      values.forEach((val, j) => {
        const cell = row.getCell(j + 1);
        cell.value = val;
        cell.fill = bg;
        if (j === 3) cell.numFmt = '$ #,##0';
        if (j === 0) cell.numFmt = 'DD/MM/YYYY';
      });
      row.commit();
      rowNum++;
    }

    // — Luego las filas de gasto (tipo "Gasto" → SUMIF las suma en C3)
    transactions.forEach((tx: ExpenseRow) => {
      const row = wsTx.getRow(rowNum);
      const bg = (rowNum - 7) % 2 === 0 ? fillAlt : fillWhite;
      const cat = tx.category_id ? catMap.get(tx.category_id) : undefined;
      const values = [
        new Date(tx.date + 'T00:00:00'),   // A: Fecha
        'Gasto',                            // B: Tipo
        tx.description ?? '',              // C: Descripción
        tx.amount,                          // D: Monto
        cat?.name ?? 'Sin categoría',       // E: Categoría
        '',                                 // F: Método pago
        '',                                 // G: Notas
      ];
      values.forEach((val, j) => {
        const cell = row.getCell(j + 1);
        cell.value = val;
        cell.fill = bg;
        if (j === 3) cell.numFmt = '$ #,##0';
        if (j === 0) cell.numFmt = 'DD/MM/YYYY';
      });
      row.commit();
      rowNum++;
    });

    // 6. Actualizar resultados cacheados de fórmulas en hoja Análisis
    // (para que lectores sin recálculo automático muestren valores correctos)
    const wsAnalisis = wb.getWorksheet('📈 Análisis');
    if (wsAnalisis) {
      // Ingresos vs Egresos (filas 18-20, columna B)
      const anaRows: [number, number][] = [
        [18, totalIncome],
        [19, totalExpenses],
        [20, balance],
      ];
      for (const [r, val] of anaRows) {
        const cell = wsAnalisis.getRow(r).getCell(2);
        if (cell.value && typeof cell.value === 'object' && 'formula' in cell.value) {
          cell.value = { formula: (cell.value as ExcelJS.CellFormulaValue).formula, result: val };
        }
      }

      // Gastos por categoría (filas 5-12, columna B): categorías fijas del template
      const anaCategories = [
        'Vivienda', 'Deudas', 'Entretenimiento', 'Salud',
        'Salidas', 'Educación', 'Otros', 'Ahorro',
      ];
      anaCategories.forEach((catName, i) => {
        const cell = wsAnalisis.getRow(5 + i).getCell(2);
        const total = categorySums.get(catName) ?? 0;
        if (cell.value && typeof cell.value === 'object' && 'formula' in cell.value) {
          cell.value = { formula: (cell.value as ExcelJS.CellFormulaValue).formula, result: total };
        }
      });
    }

    // 7. Merge ZIP: reinyectar gráficos del template en el buffer generado por ExcelJS
    // (ExcelJS no preserva charts — los copiamos a nivel de ZIP desde el template original)
    const excelBuffer = await wb.xlsx.writeBuffer();

    const [templateZip, outputZip] = await Promise.all([
      JSZip.loadAsync(fs.readFileSync(templatePath)),
      JSZip.loadAsync(excelBuffer as ArrayBuffer),
    ]);

    // Archivos de gráficos a copiar directamente del template
    const chartFiles = [
      'xl/charts/chart1.xml',
      'xl/charts/chart2.xml',
      'xl/drawings/drawing1.xml',
      'xl/drawings/_rels/drawing1.xml.rels',
      'xl/worksheets/_rels/sheet4.xml.rels', // relación Análisis → drawing
    ];

    await Promise.all(
      chartFiles.map(async (filePath) => {
        const file = templateZip.file(filePath);
        if (file) {
          outputZip.file(filePath, await file.async('arraybuffer'));
        }
      })
    );

    // ExcelJS elimina el elemento <drawing r:id="rId1"/> del sheet4.xml (Análisis).
    // Sin este elemento Excel no puede enlazar la hoja con el drawing y los gráficos no aparecen.
    // Lo reinsertamos antes del cierre </worksheet>.
    const sheet4Xml = await outputZip.file('xl/worksheets/sheet4.xml')!.async('string');
    const sheet4Fixed = sheet4Xml.replace('</worksheet>', '<drawing r:id="rId1"/></worksheet>');
    outputZip.file('xl/worksheets/sheet4.xml', sheet4Fixed);

    // Fusionar [Content_Types].xml: agregar los Override de charts y drawings que ExcelJS omite
    const [templateCT, outputCT] = await Promise.all([
      templateZip.file('[Content_Types].xml')!.async('string'),
      outputZip.file('[Content_Types].xml')!.async('string'),
    ]);

    const chartOverrides = [...templateCT.matchAll(
      /<Override[^>]*PartName="\/xl\/(?:charts|drawings)\/[^"]*"[^>]*\/>/g
    )].map((m) => m[0]);

    const mergedCT = outputCT.replace(
      '</Types>',
      chartOverrides.join('\n  ') + '\n</Types>'
    );
    outputZip.file('[Content_Types].xml', mergedCT);

    const finalBuffer = await outputZip.generateAsync({
      type: 'arraybuffer',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 },
    });

    const monthName = MONTH_NAMES[month];
    const filename = `reporte_${monthName.toLowerCase()}_${year}.xlsx`;

    return new NextResponse(new Uint8Array(finalBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });

  } catch (err) {
    console.error('[export/excel] Error:', err);
    return NextResponse.json({ error: 'Error generando el reporte' }, { status: 500 });
  }
}