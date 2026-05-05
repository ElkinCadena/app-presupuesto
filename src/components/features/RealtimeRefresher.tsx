'use client';

import { useRealtimeRefresh } from '@/hooks/useRealtimeRefresh';

interface Props {
  userId: string;
}

export default function RealtimeRefresher({ userId }: Props) {
  useRealtimeRefresh(userId);
  return null; // no renderiza nada
}