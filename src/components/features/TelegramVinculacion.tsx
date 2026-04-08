'use client';

import { type FC, useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  generarTokenTelegram,
  desvincularTelegram,
  verificarVinculacionTelegram,
} from '@/app/(protected)/app/configuracion/actions';

interface TelegramVinculacionProps {
  /** chat_id del usuario si ya está vinculado, null si no */
  telegramChatId: number | null;
}

const TelegramVinculacion: FC<TelegramVinculacionProps> = ({ telegramChatId }) => {
  const [token, setToken] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [unlinking, setUnlinking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unlinked, setUnlinked] = useState(false);

  const router = useRouter();
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isVinculado = telegramChatId !== null && !unlinked;

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  // Polling: verificar vinculación cada 5s mientras haya un token activo
  useEffect(() => {
    if (!token || isVinculado) {
      stopPolling();
      return;
    }

    pollingRef.current = setInterval(async () => {
      const result = await verificarVinculacionTelegram();
      if ('data' in result && result.data.vinculado) {
        stopPolling();
        router.refresh();
      }
    }, 5000);

    return () => stopPolling();
  }, [token, isVinculado, stopPolling, router]);

  const handleGenerar = async () => {
    setError(null);
    setLoading(true);
    const result = await generarTokenTelegram();
    setLoading(false);
    if ('error' in result) {
      setError(result.error);
    } else {
      setToken(result.data.token);
      setExpiresAt(result.data.expiresAt);
    }
  };

  const handleDesvincular = async () => {
    setError(null);
    setUnlinking(true);
    const result = await desvincularTelegram();
    setUnlinking(false);
    if ('error' in result) {
      setError(result.error);
    } else {
      setUnlinked(true);
      setToken(null);
      setExpiresAt(null);
    }
  };

  const minutosRestantes = expiresAt
    ? Math.max(0, Math.round((new Date(expiresAt).getTime() - Date.now()) / 60000))
    : null;

  return (
    <div className="flex flex-col gap-4">
      {/* Estado de vinculación */}
      <div className="flex items-center gap-3">
        <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${isVinculado ? 'bg-emerald-500' : 'bg-gray-300'}`} />
        <p className="text-sm text-gray-700">
          {isVinculado ? (
            <span>Cuenta vinculada con Telegram</span>
          ) : (
            <span className="text-gray-500">No vinculado</span>
          )}
        </p>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Flujo: NO vinculado */}
      {!isVinculado && (
        <div className="flex flex-col gap-3">
          <p className="text-xs text-gray-500 leading-relaxed">
            Genera un código, ábrelo en Telegram y escribe{' '}
            <code className="bg-gray-100 px-1.5 py-0.5 rounded text-gray-700 font-mono">/vincular CÓDIGO</code>
            {' '}al bot.
          </p>

          {!token ? (
            <button
              type="button"
              onClick={handleGenerar}
              disabled={loading}
              className="self-start flex items-center gap-2 px-4 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-60 transition-colors"
            >
              {/* Telegram icon */}
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.248-1.97 9.289c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12L7.48 14.498l-2.95-.924c-.64-.204-.654-.64.136-.948l11.532-4.448c.533-.194 1.002.13.834.94z"/>
              </svg>
              {loading ? 'Generando...' : 'Generar código'}
            </button>
          ) : (
            <div className="flex flex-col gap-3">
              {/* Código generado */}
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex flex-col gap-2">
                <p className="text-xs text-blue-600 font-medium uppercase tracking-wide">Tu código de vinculación</p>
                <p className="text-2xl font-bold text-blue-900 tracking-widest font-mono">{token}</p>
                {minutosRestantes !== null && (
                  <p className="text-xs text-blue-500">
                    Expira en {minutosRestantes} minuto{minutosRestantes !== 1 ? 's' : ''}
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <p className="text-xs text-gray-500">1. Abre Telegram y busca tu bot</p>
                <p className="text-xs text-gray-500">
                  2. Escribe:{' '}
                  <code className="bg-gray-100 px-1.5 py-0.5 rounded text-gray-700 font-mono">
                    /vincular {token}
                  </code>
                </p>
              </div>

              <button
                type="button"
                onClick={handleGenerar}
                disabled={loading}
                className="self-start text-xs text-blue-600 hover:underline disabled:opacity-60"
              >
                Generar nuevo código
              </button>
            </div>
          )}
        </div>
      )}

      {/* Flujo: YA vinculado */}
      {isVinculado && (
        <button
          type="button"
          onClick={handleDesvincular}
          disabled={unlinking}
          className="self-start px-4 py-2 rounded-lg border border-red-200 text-red-600 text-sm font-medium hover:bg-red-50 disabled:opacity-60 transition-colors"
        >
          {unlinking ? 'Desvinculando...' : 'Desvincular Telegram'}
        </button>
      )}
    </div>
  );
};

export default TelegramVinculacion;
