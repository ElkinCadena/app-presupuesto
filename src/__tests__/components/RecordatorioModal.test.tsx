import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const crearRecordatorioMock = jest.fn().mockResolvedValue({ data: true });
const editarRecordatorioMock = jest.fn().mockResolvedValue({ data: true });

jest.mock('../../app/(protected)/app/recordatorios/actions', () => ({
  crearRecordatorio: (input: unknown) => crearRecordatorioMock(input),
  editarRecordatorio: (input: unknown) => editarRecordatorioMock(input),
  eliminarRecordatorio: jest.fn(),
  toggleRecordatorio: jest.fn(),
}));

import RecordatorioModal from '../../components/features/RecordatorioModal';

const onCloseMock = jest.fn();

describe('RecordatorioModal — render', () => {
  beforeEach(() => onCloseMock.mockClear());

  it('no renderiza nada cuando isOpen=false', () => {
    const { container } = render(<RecordatorioModal isOpen={false} onClose={onCloseMock} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('muestra el título "Nuevo recordatorio" en modo crear', () => {
    render(<RecordatorioModal isOpen onClose={onCloseMock} />);
    expect(screen.getByText('Nuevo recordatorio')).toBeInTheDocument();
  });

  it('muestra el título "Editar recordatorio" en modo editar', () => {
    const rec = { id: 'r1', user_id: 'u1', name: 'Netflix', amount: 49900, day_of_month: 15, active: true, created_at: new Date().toISOString() };
    render(<RecordatorioModal isOpen onClose={onCloseMock} recordatorio={rec} />);
    expect(screen.getByText('Editar recordatorio')).toBeInTheDocument();
  });

  it('precarga nombre y día al editar', () => {
    const rec = { id: 'r1', user_id: 'u1', name: 'Spotify', amount: null, day_of_month: 5, active: true, created_at: new Date().toISOString() };
    render(<RecordatorioModal isOpen onClose={onCloseMock} recordatorio={rec} />);
    expect(screen.getByDisplayValue('Spotify')).toBeInTheDocument();
    expect(screen.getByDisplayValue('5')).toBeInTheDocument();
  });
});

describe('RecordatorioModal — interacción', () => {
  beforeEach(() => {
    crearRecordatorioMock.mockClear();
    editarRecordatorioMock.mockClear();
    onCloseMock.mockClear();
  });

  it('llama a crearRecordatorio con los datos correctos', async () => {
    render(<RecordatorioModal isOpen onClose={onCloseMock} />);
    fireEvent.change(screen.getByLabelText(/nombre/i), { target: { value: 'Gym' } });
    fireEvent.change(screen.getByLabelText(/día del mes/i), { target: { value: '10' } });
    fireEvent.submit(screen.getByLabelText(/nombre/i).closest('form')!);
    await waitFor(() =>
      expect(crearRecordatorioMock).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Gym', day_of_month: 10 })
      )
    );
  });

  it('llama a editarRecordatorio en modo editar', async () => {
    const rec = { id: 'r1', user_id: 'u1', name: 'Netflix', amount: 49900, day_of_month: 15, active: true, created_at: new Date().toISOString() };
    render(<RecordatorioModal isOpen onClose={onCloseMock} recordatorio={rec} />);
    fireEvent.change(screen.getByLabelText(/nombre/i), { target: { value: 'Netflix HD' } });
    fireEvent.submit(screen.getByLabelText(/nombre/i).closest('form')!);
    await waitFor(() =>
      expect(editarRecordatorioMock).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'r1', name: 'Netflix HD' })
      )
    );
  });

  it('llama a onClose al hacer click en el botón Cerrar', () => {
    render(<RecordatorioModal isOpen onClose={onCloseMock} />);
    fireEvent.click(screen.getByRole('button', { name: /cerrar/i }));
    expect(onCloseMock).toHaveBeenCalled();
  });
});

describe('RecordatorioModal — seguridad', () => {
  beforeEach(() => {
    crearRecordatorioMock.mockClear();
    onCloseMock.mockClear();
  });

  it('muestra error si el nombre está vacío', async () => {
    render(<RecordatorioModal isOpen onClose={onCloseMock} />);
    fireEvent.change(screen.getByLabelText(/día del mes/i), { target: { value: '10' } });
    fireEvent.submit(screen.getByLabelText(/día del mes/i).closest('form')!);
    await screen.findByText(/el nombre es requerido/i);
    expect(crearRecordatorioMock).not.toHaveBeenCalled();
  });

  it('muestra error si el día es inválido (0)', async () => {
    render(<RecordatorioModal isOpen onClose={onCloseMock} />);
    fireEvent.change(screen.getByLabelText(/nombre/i), { target: { value: 'Test' } });
    fireEvent.change(screen.getByLabelText(/día del mes/i), { target: { value: '0' } });
    fireEvent.submit(screen.getByLabelText(/nombre/i).closest('form')!);
    await screen.findByText(/día válido entre 1 y 31/i);
    expect(crearRecordatorioMock).not.toHaveBeenCalled();
  });

  it('muestra error si el día es inválido (32)', async () => {
    render(<RecordatorioModal isOpen onClose={onCloseMock} />);
    fireEvent.change(screen.getByLabelText(/nombre/i), { target: { value: 'Test' } });
    fireEvent.change(screen.getByLabelText(/día del mes/i), { target: { value: '32' } });
    fireEvent.submit(screen.getByLabelText(/nombre/i).closest('form')!);
    await screen.findByText(/día válido entre 1 y 31/i);
    expect(crearRecordatorioMock).not.toHaveBeenCalled();
  });

  it('muestra error si crearRecordatorio falla', async () => {
    crearRecordatorioMock.mockResolvedValueOnce({ error: 'No autorizado' });
    render(<RecordatorioModal isOpen onClose={onCloseMock} />);
    fireEvent.change(screen.getByLabelText(/nombre/i), { target: { value: 'Test' } });
    fireEvent.change(screen.getByLabelText(/día del mes/i), { target: { value: '5' } });
    fireEvent.submit(screen.getByLabelText(/nombre/i).closest('form')!);
    await screen.findByText(/no autorizado/i);
    expect(onCloseMock).not.toHaveBeenCalled();
  });

  it('el botón queda disabled mientras se procesa', () => {
    crearRecordatorioMock.mockReturnValue(new Promise(() => {}));
    render(<RecordatorioModal isOpen onClose={onCloseMock} />);
    fireEvent.change(screen.getByLabelText(/nombre/i), { target: { value: 'Gym' } });
    fireEvent.change(screen.getByLabelText(/día del mes/i), { target: { value: '1' } });
    fireEvent.submit(screen.getByLabelText(/nombre/i).closest('form')!);
    expect(screen.getByRole('button', { name: /guardando/i })).toBeDisabled();
  });

  it('el input de nombre tiene maxLength=80', () => {
    render(<RecordatorioModal isOpen onClose={onCloseMock} />);
    expect(screen.getByLabelText(/nombre/i)).toHaveAttribute('maxLength', '80');
  });
});