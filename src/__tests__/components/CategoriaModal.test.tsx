import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const crearCategoriaMock = jest.fn().mockResolvedValue({ data: true });
const editarCategoriaMock = jest.fn().mockResolvedValue({ data: true });

jest.mock('../../app/(protected)/app/configuracion/actions', () => ({
  crearCategoria: (input: unknown) => crearCategoriaMock(input),
  editarCategoria: (input: unknown) => editarCategoriaMock(input),
  actualizarPerfil: jest.fn(),
  eliminarCategoria: jest.fn(),
}));

import CategoriaModal from '../../components/features/CategoriaModal';

const onCloseMock = jest.fn();

describe('CategoriaModal — render', () => {
  beforeEach(() => onCloseMock.mockClear());

  it('no renderiza nada cuando isOpen=false', () => {
    const { container } = render(<CategoriaModal isOpen={false} onClose={onCloseMock} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('muestra el título "Nueva categoría" en modo crear', () => {
    render(<CategoriaModal isOpen onClose={onCloseMock} />);
    expect(screen.getByText('Nueva categoría')).toBeInTheDocument();
  });

  it('muestra el título "Editar categoría" en modo editar', () => {
    const cat = { id: 'c1', name: 'Gym', color: '#ef4444' };
    render(<CategoriaModal isOpen onClose={onCloseMock} categoria={cat} />);
    expect(screen.getByText('Editar categoría')).toBeInTheDocument();
  });

  it('precarga el nombre al editar', () => {
    const cat = { id: 'c1', name: 'Transporte', color: '#3b82f6' };
    render(<CategoriaModal isOpen onClose={onCloseMock} categoria={cat} />);
    expect(screen.getByDisplayValue('Transporte')).toBeInTheDocument();
  });

  it('muestra el input de nombre y el botón guardar', () => {
    render(<CategoriaModal isOpen onClose={onCloseMock} />);
    expect(screen.getByLabelText(/nombre/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /guardar/i })).toBeInTheDocument();
  });
});

describe('CategoriaModal — interacción', () => {
  beforeEach(() => {
    crearCategoriaMock.mockClear();
    editarCategoriaMock.mockClear();
    onCloseMock.mockClear();
  });

  it('llama a crearCategoria con name y color al guardar', async () => {
    render(<CategoriaModal isOpen onClose={onCloseMock} />);
    fireEvent.change(screen.getByLabelText(/nombre/i), { target: { value: 'Mascota' } });
    fireEvent.submit(screen.getByRole('button', { name: /guardar/i }).closest('form')!);
    await waitFor(() =>
      expect(crearCategoriaMock).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Mascota' })
      )
    );
  });

  it('llama a editarCategoria en modo editar', async () => {
    const cat = { id: 'c1', name: 'Gym', color: '#ef4444' };
    render(<CategoriaModal isOpen onClose={onCloseMock} categoria={cat} />);
    fireEvent.change(screen.getByLabelText(/nombre/i), { target: { value: 'Gym Plus' } });
    fireEvent.submit(screen.getByRole('button', { name: /guardar/i }).closest('form')!);
    await waitFor(() =>
      expect(editarCategoriaMock).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'c1', name: 'Gym Plus' })
      )
    );
  });

  it('llama a onClose al hacer click en el backdrop', () => {
    render(<CategoriaModal isOpen onClose={onCloseMock} />);
    fireEvent.click(document.querySelector('[aria-hidden="true"]')!);
    expect(onCloseMock).toHaveBeenCalled();
  });

  it('llama a onClose al hacer click en el botón Cerrar', () => {
    render(<CategoriaModal isOpen onClose={onCloseMock} />);
    fireEvent.click(screen.getByRole('button', { name: /cerrar/i }));
    expect(onCloseMock).toHaveBeenCalled();
  });

  it('cambia el color al hacer click en un swatch', () => {
    render(<CategoriaModal isOpen onClose={onCloseMock} />);
    const swatches = screen.getAllByRole('button', { name: /^Color #/i });
    fireEvent.click(swatches[0]);
    // El swatch clickeado debe tener la clase scale-125
    expect(swatches[0]).toHaveClass('scale-125');
  });
});

describe('CategoriaModal — seguridad', () => {
  beforeEach(() => {
    crearCategoriaMock.mockClear();
    onCloseMock.mockClear();
  });

  it('muestra error si el nombre está vacío al guardar', async () => {
    render(<CategoriaModal isOpen onClose={onCloseMock} />);
    fireEvent.submit(screen.getByRole('button', { name: /guardar/i }).closest('form')!);
    await screen.findByText(/el nombre es requerido/i);
    expect(crearCategoriaMock).not.toHaveBeenCalled();
  });

  it('muestra error si crearCategoria falla', async () => {
    crearCategoriaMock.mockResolvedValueOnce({ error: 'Sin conexión' });
    render(<CategoriaModal isOpen onClose={onCloseMock} />);
    fireEvent.change(screen.getByLabelText(/nombre/i), { target: { value: 'Test' } });
    fireEvent.submit(screen.getByRole('button', { name: /guardar/i }).closest('form')!);
    await screen.findByText(/sin conexión/i);
    expect(onCloseMock).not.toHaveBeenCalled();
  });

  it('no llama a crearCategoria con nombre de solo espacios', async () => {
    render(<CategoriaModal isOpen onClose={onCloseMock} />);
    fireEvent.change(screen.getByLabelText(/nombre/i), { target: { value: '   ' } });
    fireEvent.submit(screen.getByRole('button', { name: /guardar/i }).closest('form')!);
    await screen.findByText(/el nombre es requerido/i);
    expect(crearCategoriaMock).not.toHaveBeenCalled();
  });

  it('el botón queda disabled mientras se procesa', () => {
    crearCategoriaMock.mockReturnValue(new Promise(() => {}));
    render(<CategoriaModal isOpen onClose={onCloseMock} />);
    fireEvent.change(screen.getByLabelText(/nombre/i), { target: { value: 'Salud' } });
    fireEvent.submit(screen.getByRole('button', { name: /guardar/i }).closest('form')!);
    expect(screen.getByRole('button', { name: /guardando/i })).toBeDisabled();
  });

  it('el input de nombre tiene maxLength=60', () => {
    render(<CategoriaModal isOpen onClose={onCloseMock} />);
    expect(screen.getByLabelText(/nombre/i)).toHaveAttribute('maxLength', '60');
  });
});