---
name: nueva-ruta
description: "Crea una nueva página o ruta en el App Router de Next.js 15 siguiendo las convenciones del proyecto. Usar cuando necesito agregar una sección nueva: dashboard, detalle de mes, configuración, etc. Incluye layout, page, loading y error si aplica."
argument-hint: "Nombre y propósito de la ruta. Ej: /app/meses/[id] — detalle de un mes específico"
---

# Nueva ruta — App Router Next.js 15

## Cuándo usar
- Agregar una nueva página a la aplicación
- Crear estructura de archivos de una ruta del App Router

## Paso 1 — Determinar la ubicación

Todas las rutas protegidas (requieren login) van bajo `src/app/(app)/`.
Las rutas públicas (login) van bajo `src/app/(auth)/`.

Estructura de los archivos de la ruta:
```
src/app/(app)/[feature]/
  page.tsx        # Obligatorio — componente de la página
  layout.tsx      # Opcional — layout específico de la sección
  loading.tsx     # Opcional — UI de carga (Suspense boundary automático)
  error.tsx       # Opcional — manejo de errores ('use client' requerido)
  actions.ts      # Opcional — Server Actions de esta ruta
```

## Paso 2 — Convenciones de page.tsx

`page.tsx` es siempre un **Server Component** por defecto.
Lee datos directamente desde Supabase usando el cliente server.

```tsx
import { createServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

// Metadatos estáticos o dinámicos
export const metadata = {
  title: 'Nombre de la página — Presupuesto',
};

// Props estándar de Next.js App Router
interface PageProps {
  params: Promise<{ id: string }>;       // rutas dinámicas
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function NombrePage({ params, searchParams }: PageProps) {
  const supabase = await createServerClient();

  // Verificar sesión
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // Fetch de datos del servidor
  const { data, error } = await supabase
    .from('tabla')
    .select('*')
    .eq('user_id', user.id);

  if (error) throw new Error(error.message);

  return (
    <main>
      {/* Componentes de features que reciben los datos como props */}
    </main>
  );
}
```

## Paso 3 — Separación Server / Client

- La `page.tsx` obtiene los datos y los pasa como props a componentes
- Los componentes interactivos (formularios, gráficas) son Client Components separados
- Nunca mezclar fetch de datos y hooks de estado en el mismo componente

## Paso 4 — Server Actions (actions.ts)

```ts
'use server';

import { createServerClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

// Siempre retornar { error } | { data }
export async function crearGasto(formData: FormData): Promise<{ error: string } | { data: Gasto }> {
  const supabase = await createServerClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'No autorizado' };

  // lógica de la action
  const { data, error } = await supabase.from('expenses').insert({ user_id: user.id, ...payload }).select().single();

  if (error) return { error: error.message };

  revalidatePath('/app/dashboard');
  return { data };
}
```

## Paso 5 — loading.tsx y error.tsx

### loading.tsx (Server Component)
```tsx
export default function Loading() {
  return <div className="...">Skeleton o spinner</div>;
}
```

### error.tsx (Client Component — obligatorio)
```tsx
'use client';

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div>
      <p>{error.message}</p>
      <button onClick={reset}>Reintentar</button>
    </div>
  );
}
```

## Reglas de calidad

- Verificar sesión en todas las páginas protegidas — sin excepciones
- `user_id` solo se filtra en el servidor (RLS activada, pero igual verificar)
- Tipos de Supabase desde `@/lib/supabase/types.ts` — nunca `any`
- Rutas dinámicas: `params` es `Promise` en Next.js 15, siempre usar `await params`
