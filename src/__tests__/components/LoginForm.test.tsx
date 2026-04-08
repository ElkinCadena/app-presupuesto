import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

// ── Mock de Supabase browser client ──────────────────────────────────────
const signInWithOAuthMock = jest.fn().mockResolvedValue({ error: null });
jest.mock('../../lib/supabase/client', () => ({
  createBrowserSupabaseClient: () => ({
    auth: { signInWithOAuth: signInWithOAuthMock },
  }),
}));

import LoginForm from '../../components/features/LoginForm';

// ── Render ────────────────────────────────────────────────────────────────

describe('LoginForm — render', () => {
  it('muestra el botón de Google', () => {
    render(<LoginForm />);
    expect(screen.getByRole('button', { name: /google/i })).toBeInTheDocument();
  });

  it('muestra el botón de GitHub', () => {
    render(<LoginForm />);
    expect(screen.getByRole('button', { name: /github/i })).toBeInTheDocument();
  });

  it('no muestra mensaje de error en el estado inicial', () => {
    render(<LoginForm />);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});

// ── Interacción ───────────────────────────────────────────────────────────

describe('LoginForm — interacción', () => {
  beforeEach(() => signInWithOAuthMock.mockClear());

  it('llama a signInWithOAuth con "google" al hacer click en Google', async () => {
    render(<LoginForm />);
    fireEvent.click(screen.getByRole('button', { name: /google/i }));
    await Promise.resolve();
    expect(signInWithOAuthMock).toHaveBeenCalledWith(
      expect.objectContaining({ provider: 'google' })
    );
  });

  it('llama a signInWithOAuth con "github" al hacer click en GitHub', async () => {
    render(<LoginForm />);
    fireEvent.click(screen.getByRole('button', { name: /github/i }));
    await Promise.resolve();
    expect(signInWithOAuthMock).toHaveBeenCalledWith(
      expect.objectContaining({ provider: 'github' })
    );
  });

  it('muestra mensaje de error si signInWithOAuth falla', async () => {
    signInWithOAuthMock.mockResolvedValueOnce({ error: { message: 'fail' } });
    render(<LoginForm />);
    fireEvent.click(screen.getByRole('button', { name: /google/i }));
    const alert = await screen.findByRole('alert');
    expect(alert).toBeInTheDocument();
    expect(alert.textContent).toMatch(/iniciar sesión/i);
  });
});

// ── Seguridad ─────────────────────────────────────────────────────────────

describe('LoginForm — seguridad', () => {
  beforeEach(() => signInWithOAuthMock.mockClear());

  it('los botones quedan disabled mientras se procesa el login', () => {
    // signInWithOAuth nunca resuelve → estado loading activo
    signInWithOAuthMock.mockReturnValue(new Promise(() => {}));
    render(<LoginForm />);
    fireEvent.click(screen.getByRole('button', { name: /google/i }));
    expect(screen.getByRole('button', { name: /google/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /github/i })).toBeDisabled();
  });

  it('el redirectTo usa window.location.origin, no un string hardcodeado', async () => {
    render(<LoginForm />);
    fireEvent.click(screen.getByRole('button', { name: /google/i }));
    await Promise.resolve();
    const call = signInWithOAuthMock.mock.calls[0][0];
    expect(call.options?.redirectTo).toContain(window.location.origin);
    expect(call.options?.redirectTo).toContain('/auth/callback');
  });

  it('no expone el error interno de Supabase al usuario', async () => {
    signInWithOAuthMock.mockResolvedValueOnce({ error: { message: 'internal_supabase_error_xyz' } });
    render(<LoginForm />);
    fireEvent.click(screen.getByRole('button', { name: /github/i }));
    const alert = await screen.findByRole('alert');
    expect(alert.textContent).not.toContain('internal_supabase_error_xyz');
  });
});