import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const guardarNombrePerfilMock = jest.fn().mockResolvedValue(undefined);
jest.mock('../app/(protected)/app/onboarding/actions', () => ({
  guardarNombrePerfil: (input: unknown) => guardarNombrePerfilMock(input),
}));

const pushMock = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
}));

import OnboardingForm from '../components/features/OnboardingForm';

describe('OnboardingForm — render', () => {
  it('muestra el input de nombre', () => {
    render(<OnboardingForm />);
    expect(screen.getByLabelText(/tu nombre/i)).toBeInTheDocument();
  });
  it('muestra el botón de continuar', () => {
    render(<OnboardingForm />);
    expect(screen.getByRole('button', { name: /continuar/i })).toBeInTheDocument();
  });
  it('no muestra error en el estado inicial', () => {
    render(<OnboardingForm />);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});

describe('OnboardingForm — interacción', () => {
  beforeEach(() => guardarNombrePerfilMock.mockClear());

  it('llama a guardarNombrePerfil al enviar el formulario', async () => {
    render(<OnboardingForm />);
    fireEvent.change(screen.getByLabelText(/tu nombre/i), { target: { value: 'María López' } });
    fireEvent.submit(screen.getByRole('button', { name: /continuar/i }).closest('form')!);
    await waitFor(() => expect(guardarNombrePerfilMock).toHaveBeenCalledTimes(1));
  });

  it('muestra error si la action retorna un error', async () => {
    guardarNombrePerfilMock.mockResolvedValueOnce({ error: 'Error al guardar' });
    render(<OnboardingForm />);
    fireEvent.change(screen.getByLabelText(/tu nombre/i), { target: { value: 'Juan' } });
    fireEvent.submit(screen.getByRole('button', { name: /continuar/i }).closest('form')!);
    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toMatch(/error al guardar/i);
  });
});

describe('OnboardingForm — seguridad', () => {
  beforeEach(() => guardarNombrePerfilMock.mockClear());

  it('el botón queda disabled mientras se procesa', () => {
    guardarNombrePerfilMock.mockReturnValue(new Promise(() => {}));
    render(<OnboardingForm />);
    fireEvent.change(screen.getByLabelText(/tu nombre/i), { target: { value: 'Test' } });
    fireEvent.submit(screen.getByRole('button', { name: /continuar/i }).closest('form')!);
    expect(screen.getByRole('button', { name: /guardando/i })).toBeDisabled();
  });

  it('el input tiene minLength=2 y maxLength=80', () => {
    render(<OnboardingForm />);
    const input = screen.getByLabelText(/tu nombre/i);
    expect(input).toHaveAttribute('minLength', '2');
    expect(input).toHaveAttribute('maxLength', '80');
  });

  it('el campo es required', () => {
    render(<OnboardingForm />);
    expect(screen.getByLabelText(/tu nombre/i)).toBeRequired();
  });
});