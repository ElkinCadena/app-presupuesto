'use client';

import { type FC, useState } from 'react';
import { guardarNombrePerfil } from '@/app/(protected)/app/onboarding/actions';
import { useRouter } from 'next/navigation';

const OnboardingForm: FC = () => {
  const router = useRouter();
  const [nombre, setNombre] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const result = await guardarNombrePerfil({ full_name: nombre });
    setLoading(false);
    if (result && 'error' in result) {
      setError(result.error);
    } else {
      router.push('/app/dashboard');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      {error && (
        <div role="alert" className="rounded-lg bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="nombre" className="text-sm font-medium text-gray-700">
          Tu nombre
        </label>
        <input
          id="nombre"
          type="text"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          minLength={2}
          maxLength={80}
          required
          className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <button
        type="submit"
        disabled={loading}
        className="px-5 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-60 transition-colors"
      >
        {loading ? 'Guardando...' : 'Continuar'}
      </button>
    </form>
  );
};

export default OnboardingForm;