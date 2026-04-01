/**
 * Formatea un número como moneda en pesos colombianos (COP).
 */
export function formatCOP(amount: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
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
