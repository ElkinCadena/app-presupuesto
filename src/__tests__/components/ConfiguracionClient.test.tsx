import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const actualizarPerfilMock = jest.fn().mockResolvedValue({ data: true });
const eliminarCategoriaMock = jest.fn().mockResolvedValue({ data: true });

jest.mock('../../app/(protected)/app/configuracion/actions', () => ({
  actualizarPerfil: (input: unknown) => actualizarPerfilMock(input),
  eliminarCategoria: (id: string) => eliminarCategoriaMock(id),
  crearCategoria: jest.fn().mockResolvedValue({ data: true }),
  editarCategoria: jest.fn().mockResolvedValue({ data: true }),
}));

import ConfiguracionClient from '../../components/features/ConfiguracionClient';

const categorias = [
  { id: 'c1', name: 'Alimentación', color: '#ef4444' },
  { id: 'c2', name: 'Transporte', color: '#3b82f6' },
];

describe('ConfiguracionClient — render', () => {
  it('muestra las tabs de Perfil y Categorías', () => {
    render(<ConfiguracionClient fullName="Juan" categorias={categorias} />);
    expect(screen.getByRole('button', { name: /perfil/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /categorías/i })).toBeInTheDocument();
  });

  it('muestra el nombre actual en el input de perfil', () => {
    render(<ConfiguracionClient fullName="María" categorias={[]} />);
    expect(screen.getByDisplayValue('María')).toBeInTheDocument();
  });

  it('muestra las categorías al cambiar a la tab de Categorías', () => {
    render(<ConfiguracionClient fullName="Juan" categorias={categorias} />);
    fireEvent.click(screen.getByRole('button', { name: /categorías/i }));
    expect(screen.getByText('Alimentación')).toBeInTheDocument();
    expect(screen.getByText('Transporte')).toBeInTheDocument();
  });
});

describe('ConfiguracionClient — interacción', () => {
  beforeEach(() => {
    actualizarPerfilMock.mockClear();
    eliminarCategoriaMock.mockClear();
  });

  it('llama a actualizarPerfil al guardar el nombre', async () => {
    render(<ConfiguracionClient fullName="Juan" categorias={[]} />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Juan Actualizado' } });
    fireEvent.submit(screen.getByRole('textbox').closest('form')!);
    await waitFor(() =>
      expect(actualizarPerfilMock).toHaveBeenCalledWith({ full_name: 'Juan Actualizado' })
    );
  });

  it('muestra mensaje de éxito al guardar perfil correctamente', async () => {
    render(<ConfiguracionClient fullName="Juan" categorias={[]} />);
    fireEvent.submit(screen.getByRole('textbox').closest('form')!);
    await screen.findByText(/nombre actualizado correctamente/i);
  });

  it('llama a eliminarCategoria con el id correcto', async () => {
    render(<ConfiguracionClient fullName="Juan" categorias={categorias} />);
    fireEvent.click(screen.getByRole('button', { name: /categorías/i }));
    fireEvent.click(screen.getAllByRole('button', { name: /eliminar/i })[0]);
    await waitFor(() => expect(eliminarCategoriaMock).toHaveBeenCalledWith('c1'));
  });
});

describe('ConfiguracionClient — seguridad', () => {
  beforeEach(() => {
    actualizarPerfilMock.mockClear();
    eliminarCategoriaMock.mockClear();
  });

  it('muestra error si actualizarPerfil falla', async () => {
    actualizarPerfilMock.mockResolvedValueOnce({ error: 'Sin conexión' });
    render(<ConfiguracionClient fullName="Juan" categorias={[]} />);
    fireEvent.submit(screen.getByRole('textbox').closest('form')!);
    const alert = await screen.findByText(/sin conexión/i);
    expect(alert).toBeInTheDocument();
  });

  it('muestra error si eliminarCategoria falla', async () => {
    eliminarCategoriaMock.mockResolvedValueOnce({ error: 'No autorizado' });
    render(<ConfiguracionClient fullName="Juan" categorias={categorias} />);
    fireEvent.click(screen.getByRole('button', { name: /categorías/i }));
    fireEvent.click(screen.getAllByRole('button', { name: /eliminar/i })[0]);
    await screen.findByText(/no autorizado/i);
  });

  it('el input de nombre tiene maxLength=80', () => {
    render(<ConfiguracionClient fullName="Juan" categorias={[]} />);
    expect(screen.getByRole('textbox')).toHaveAttribute('maxLength', '80');
  });
});