/**
 * Formatea un número como moneda. Si no se indica currency usa COP por defecto.
 */
export function formatCurrency(amount: number, currency = 'COP'): string {
  const locale = currency === 'COP' ? 'es-CO' : 'es-CO';
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Formatea un número como pesos colombianos (COP). Alias de compatibilidad.
 */
export function formatCOP(amount: number): string {
  return formatCurrency(amount, 'COP');
}

/**
 * Retorna el nombre del mes en español a partir de su número (1-12).
 */
export function nombreMes(month: number): string {
  return new Intl.DateTimeFormat('es-CO', { month: 'long' }).format(
    new Date(2000, month - 1, 1)
  );
}

/**
 * Calcula el porcentaje de un parcial sobre un total. Retorna 0 si total es 0.
 */
export function calcularPorcentaje(parcial: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((parcial / total) * 100);
}

/**
 * Calcula el identificador del ciclo activo (year + month del inicio del ciclo)
 * basado en el día de corte configurado por el usuario.
 *
 * Ejemplo: hoy = 10 abril, cycleDay = 15 → ciclo empezó el 15 marzo → { year: 2026, month: 3 }
 * Ejemplo: hoy = 20 abril, cycleDay = 15 → ciclo empezó el 15 abril → { year: 2026, month: 4 }
 */
export function getCurrentCycle(
  today: Date,
  cycleDay: number
): { year: number; month: number } {
  const day = today.getDate();
  if (day >= cycleDay) {
    return { year: today.getFullYear(), month: today.getMonth() + 1 };
  }
  // Cycle started last calendar month
  const d = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  return { year: d.getFullYear(), month: d.getMonth() + 1 };
}

/**
 * Retorna el ciclo inmediatamente anterior.
 */
export function getPreviousCycle(
  year: number,
  month: number
): { year: number; month: number } {
  if (month === 1) return { year: year - 1, month: 12 };
  return { year, month: month - 1 };
}

/**
 * Genera una etiqueta legible para el período del ciclo.
 *
 * Si cycleDay = 1: "abril 2026"
 * Si cycleDay = 15: "15 mar – 14 abr 2026"
 */
export function getCycleLabel(
  year: number,
  month: number,
  cycleDay: number
): string {
  if (cycleDay === 1) {
    return `${nombreMes(month)} ${year}`;
  }
  // End date = cycleDay - 1 of the NEXT calendar month
  // Date constructor: month is 0-indexed, so passing `month` (1-indexed) acts as "next month"
  const endDate = new Date(year, month, cycleDay - 1);
  const endDay = cycleDay - 1;
  const endMonthName = nombreMes(endDate.getMonth() + 1);
  const endYear = endDate.getFullYear();
  const startMonthName = nombreMes(month);

  if (endYear === year) {
    return `${cycleDay} ${startMonthName} – ${endDay} ${endMonthName} ${year}`;
  }
  return `${cycleDay} ${startMonthName} ${year} – ${endDay} ${endMonthName} ${endYear}`;
}
