'use client';

import { useState } from 'react';

export interface MonthBudgetData {
  monthId: string;
  totalIncome: number;
  gastosTotales: number;
  totalReservadoBolsillos: number;
  disponible: number;
  bolsillos: { id: string; name: string; availableAmount: number }[];
  fuentesIniciales: { label: string; amount: number }[];
}

/**
 * Hook que envuelve los datos del ciclo activo recibidos como initialData
 * desde el Server Component. Expone los valores listos para usar en la UI.
 */
export function useMonthBudget(initialData: MonthBudgetData): MonthBudgetData {
  const [data] = useState<MonthBudgetData>(initialData);
  return data;
}
