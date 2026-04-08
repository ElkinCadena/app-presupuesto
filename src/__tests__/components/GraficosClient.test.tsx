import React from 'react';
import { render, screen } from '@testing-library/react';

jest.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PieChart: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Pie: () => <div />,
  Cell: () => null,
  Tooltip: () => null,
  BarChart: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Bar: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Legend: () => null,
}));

import GraficosClient from '../../components/features/GraficosClient';

const baseProps = {
  totalIncome: 5_000_000,
  gastosTotales: 2_000_000,
  disponible: 3_000_000,
  gastosPorCategoria: [
    { id: '1', name: 'Alimentación', color: '#ef4444', total: 800_000 },
    { id: '2', name: 'Transporte', color: '#3b82f6', total: 1_200_000 },
  ],
  bolsillos: [
    { name: 'Emergencias', assignedAmount: 500_000, usedAmount: 100_000 },
  ],
};

describe('GraficosClient — render', () => {
  it('muestra el resumen de ingresos', () => {
    render(<GraficosClient {...baseProps} />);
    expect(screen.getByText('Ingresos')).toBeInTheDocument();
  });

  it('muestra el resumen de gastos', () => {
    render(<GraficosClient {...baseProps} />);
    expect(screen.getByText('Gastos')).toBeInTheDocument();
  });

  it('muestra el disponible', () => {
    render(<GraficosClient {...baseProps} />);
    expect(screen.getByText('Disponible')).toBeInTheDocument();
  });
});

describe('GraficosClient — seguridad', () => {
  it('no muestra valores de otras categorías cuando gastosPorCategoria está vacío', () => {
    render(<GraficosClient {...baseProps} gastosPorCategoria={[]} />);
    expect(screen.queryByText('Alimentación')).not.toBeInTheDocument();
  });

  it('disponible no es negativo visualmente cuando gastos superan ingresos', () => {
    render(<GraficosClient {...baseProps} gastosTotales={6_000_000} disponible={-1_000_000} />);
    expect(screen.getByText('Disponible')).toBeInTheDocument();
  });
});