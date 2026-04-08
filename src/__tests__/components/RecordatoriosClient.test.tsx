import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const eliminarRecordatorioMock = jest.fn().mockResolvedValue({ data: true });
const toggleRecordatorioMock = jest.fn().mockResolvedValue({ data: true });

jest.mock('../../app/(protected)/app/recordatorios/actions', () => ({
  eliminarRecordatorio: (id: string) => eliminarRecordatorioMock(id),
  toggleRecordatorio: (id: string, active: boolean) => toggleRecordatorioMock(id, active),
}));

import RecordatoriosClient from '../../components/features/RecordatoriosClient';

const recordatorioBase = {
  id: 'r1',
  user_id: 'u1',
  name: 'Netflix',
  amount: 49900,
  day_of_month: 15,
  active: true,
  created_at: new Date().toISOString(),
};

describe('RecordatoriosClient — render', () => {
  it('muestra el nombre del recordatorio', () => {
    render(<RecordatoriosClient recordatorios={[recordatorioBase]} />);
    expect(screen.getByText('Netflix')).toBeInTheDocument();
  });

  it('muestra estado vacío cuando no hay recordatorios', () => {
    render(<RecordatoriosClient recordatorios={[]} />);
    expect(screen.getByText(/sin recordatorios/i)).toBeInTheDocument();
  });

  it('muestra el botón de nuevo recordatorio', () => {
    render(<RecordatoriosClient recordatorios={[]} />);
    expect(screen.getByRole('button', { name: /nuevo recordatorio/i })).toBeInTheDocument();
  });
});

describe('RecordatoriosClient — interacción', () => {
  beforeEach(() => {
    eliminarRecordatorioMock.mockClear();
    toggleRecordatorioMock.mockClear();
  });

  it('llama a eliminarRecordatorio con el id correcto', async () => {
    render(<RecordatoriosClient recordatorios={[recordatorioBase]} />);
    fireEvent.click(screen.getByRole('button', { name: /eliminar/i }));
    await waitFor(() => expect(eliminarRecordatorioMock).toHaveBeenCalledWith('r1'));
  });

  it('llama a toggleRecordatorio al hacer click en el switch', async () => {
    render(<RecordatoriosClient recordatorios={[recordatorioBase]} />);
    fireEvent.click(screen.getByRole('switch'));
    await waitFor(() => expect(toggleRecordatorioMock).toHaveBeenCalledWith('r1', false));
  });
});

describe('RecordatoriosClient — seguridad', () => {
  it('muestra error si eliminarRecordatorio falla', async () => {
    eliminarRecordatorioMock.mockResolvedValueOnce({ error: 'No autorizado' });
    render(<RecordatoriosClient recordatorios={[recordatorioBase]} />);
    fireEvent.click(screen.getByRole('button', { name: /eliminar/i }));
    const error = await screen.findByText(/no autorizado/i);
    expect(error).toBeInTheDocument();
  });
});