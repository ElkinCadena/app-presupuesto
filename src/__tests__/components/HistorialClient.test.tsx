import React from 'react';
import { render, screen } from '@testing-library/react';

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

import HistorialClient from '../../components/features/HistorialClient';
import type { MesResumen } from '../../app/(protected)/app/historial/actions';

const mesBase: MesResumen = {
  id: 'm1',
  year: 2025,
  month: 1,
  totalIncome: 5_000_000,
  totalExpenses: 3_000_000,
  balance: 2_000_000,
};

describe('HistorialClient — render', () => {
  it('muestra el nombre del mes en español', () => {
    render(<HistorialClient meses={[mesBase]} />);
    expect(screen.getByText(/enero 2025/i)).toBeInTheDocument();
  });

  it('muestra estado vacío cuando no hay meses', () => {
    render(<HistorialClient meses={[]} />);
    expect(screen.getByText(/sin historial/i)).toBeInTheDocument();
  });

  it('el enlace apunta a la ruta correcta', () => {
    render(<HistorialClient meses={[mesBase]} />);
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/app/historial/2025/1');
  });

  it('muestra badge de déficit cuando balance es negativo', () => {
    render(<HistorialClient meses={[{ ...mesBase, balance: -500_000 }]} />);
    expect(screen.getByText(/déficit/i)).toBeInTheDocument();
  });

  it('no muestra badge de déficit con balance positivo', () => {
    render(<HistorialClient meses={[mesBase]} />);
    expect(screen.queryByText(/déficit/i)).not.toBeInTheDocument();
  });
});

describe('HistorialClient — seguridad', () => {
  it('no muestra datos de un mes si la lista está vacía', () => {
    render(<HistorialClient meses={[]} />);
    expect(screen.queryByText('Enero 2025')).not.toBeInTheDocument();
  });

  it('renderiza múltiples meses sin mezclar sus datos', () => {
    const mes2: MesResumen = { ...mesBase, id: 'm2', month: 3, year: 2025 };
    render(<HistorialClient meses={[mesBase, mes2]} />);
    expect(screen.getByText(/enero 2025/i)).toBeInTheDocument();
    expect(screen.getByText(/marzo 2025/i)).toBeInTheDocument();
  });
});