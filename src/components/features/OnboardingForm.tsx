'use client';

import { type FC, useState } from 'react';
import { guardarNombrePerfil } from '@/app/(protected)/app/onboarding/actions';

const OnboardingForm: FC = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const full_name = formData.get('full_name') as string;

    const result = await guardarNombrePerfil({ full_name });

    if (result?.error) {
      setError(result.error);
      setLoading(false);
    }
    // Si no hay error, la Server Action redirige automáticamente
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 w-full">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="full_name" className="text-sm font-medium text-gray-700">
          Tu nombre
        </label>
        <input
          id="full_name"
          name="full_name"
          type="text"
          autoFocus
          autoComplete="given-name"
          placeholder="Ej: María López"
          required
          minLength={2}
          maxLength={80}
          className="w-full px-4 py-2.5 rounded-lg border border-gray-300 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
        />
      </div>

      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full px-4 py-2.5 rounded-lg bg-blue-600 text-white font-medium text-sm hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? 'Guardando...' : 'Continuar'}
      </button>
    </form>
  );
};

export default OnboardingForm;
