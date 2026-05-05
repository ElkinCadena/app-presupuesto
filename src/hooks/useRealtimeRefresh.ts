'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';

/**
 * Escucha INSERTs en la tabla `expenses` del usuario activo y
 * llama a router.refresh() para que Next.js re-ejecute los Server Components
 * sin perder el estado del cliente.
 */
export function useRealtimeRefresh(userId: string | undefined) {
  const router = useRouter();

  useEffect(() => {
    if (!userId) return;

    const supabase = createBrowserSupabaseClient();

    const channel = supabase
      .channel('expenses-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'expenses',
          filter: `user_id=eq.${userId}`,
        },
        () => {
          router.refresh();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, router]);
}