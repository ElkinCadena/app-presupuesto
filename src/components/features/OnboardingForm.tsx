'use client';

import { type FC, useState } from 'react';
import { guardarOnboarding } from '@/app/(protected)/app/onboarding/actions';
import { useRouter } from 'next/navigation';

const CYCLE_OPTIONS = [
  { value: 1, label: '1 — Primero de cada mes' },
  { value: 5, label: '5 — Día 5' },
  { value: 10, label: '10 — Día 10' },
  { value: 15, label: '15 — Quincena' },
  { value: 20, label: '20 — Día 20' },
  { value: 25, label: '25 — Día 25' },
];

const OnboardingForm: FC = () => {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [nombre, setNombre] = useState('');
  const [cycleDay, setCycleDay] = useState<number>(1);
  const [customDay, setCustomDay] = useState('');
  const [useCustom, setUseCustom] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleStep1 = (e: React.FormEvent) => {
    e.preventDefault();
    if (nombre.trim().length < 2) {
      setError('El nombre debe tener al menos 2 caracteres.');
      return;
    }
    setError(null);
    setStep(2);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const day = useCustom ? parseInt(customDay, 10) : cycleDay;
    if (isNaN(day) || day < 1 || day > 28) {
      setError('Elige un día entre 1 y 28.');
      return;
    }

    setLoading(true);
    const result = await guardarOnboarding({ full_name: nombre, billing_cycle_day: day });
    setLoading(false);
    if (result && 'error' in result) {
      setError(result.error);
    } else {
      router.push('/app/dashboard');
    }
  };

  return (
    <>
      {error && (
        <div role="alert" className="rounded-lg bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-700 mb-4">
          {error}
        </div>
      )}
      <div className="flex items-center gap-2 mb-6">
        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${step >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'}`}>1</div>
        <div className={`flex-1 h-0.5 rounded ${step >= 2 ? 'bg-blue-600' : 'bg-gray-200'}`} />
        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${step >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'}`}>2</div>
      </div>

      {step === 1 && (
        <form onSubmit={handleStep1} className="flex flex-col gap-5">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="nombre" className="text-sm font-medium text-gray-700">Tu nombre</label>
            <input
              id="nombre"
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              minLength={2}
              maxLength={80}
              required
              autoFocus
              placeholder="Ej: Carlos"
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button type="submit" className="px-5 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors">
            Continuar →
          </button>
        </form>
      )}

      {step === 2 && (
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="bg-blue-50 rounded-lg px-4 py-3 text-sm text-blue-700">
            <strong>¿Cuándo recibes tu ingreso principal?</strong><br />
            <span className="text-blue-600">Elige el día del mes que marca el inicio de tu ciclo de presupuesto.</span>
          </div>
          <div className="flex flex-col gap-2">
            {CYCLE_OPTIONS.map((opt) => (
              <label
                key={opt.value}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg border cursor-pointer transition-colors ${!useCustom && cycleDay === opt.value ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}
              >
                <input type="radio" name="cycleDay" value={opt.value} checked={!useCustom && cycleDay === opt.value}
                  onChange={() => { setCycleDay(opt.value); setUseCustom(false); setError(null); }} className="sr-only" />
                <span className={`w-4 h-4 rounded-full border-2 flex-shrink-0 ${!useCustom && cycleDay === opt.value ? 'border-blue-500 bg-blue-500' : 'border-gray-300'}`} />
                <span className="text-sm text-gray-700">{opt.label}</span>
              </label>
            ))}
            <label className={`flex items-center gap-3 px-4 py-3 rounded-lg border cursor-pointer transition-colors ${useCustom ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}>
              <input type="radio" name="cycleDay" checked={useCustom} onChange={() => setUseCustom(true)} className="sr-only" />
              <span className={`w-4 h-4 rounded-full border-2 flex-shrink-0 ${useCustom ? 'border-blue-500 bg-blue-500' : 'border-gray-300'}`} />
              <span className="text-sm text-gray-700 flex-1">Otro día:</span>
              <input type="number" min={1} max={28} placeholder="1-28" value={customDay}
                onChange={(e) => { setCustomDay(e.target.value); setUseCustom(true); }}
                onClick={() => setUseCustom(true)}
                className="w-20 px-2 py-1 border border-gray-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </label>
          </div>
          <p className="text-xs text-gray-400">Máximo día 28 para funcionar correctamente en todos los meses del año.</p>
          <div className="flex gap-3">
            <button type="button" onClick={() => { setStep(1); setError(null); }}
              className="flex-1 px-5 py-2.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
              ← Atrás
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 px-5 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-60 transition-colors">
              {loading ? 'Guardando...' : 'Empezar'}
            </button>
          </div>
        </form>
      )}
    </>
  );
};

export default OnboardingForm;
