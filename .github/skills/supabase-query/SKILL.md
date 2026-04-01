---
name: supabase-query
description: "Escribe queries, Server Actions y migraciones de Supabase correctamente para este proyecto. Usar cuando necesito consultar o mutar datos: leer gastos, registrar ingresos, actualizar bolsillos, crear recordatorios. Incluye tipado correcto con tipos generados y manejo de errores."
argument-hint: "Qué datos necesitas leer o modificar. Ej: obtener todos los gastos del mes actual del usuario"
---

# Queries y Server Actions — Supabase

## Cuándo usar
- Escribir una query de lectura de datos desde Supabase
- Crear o modificar una Server Action que interactúa con la BD
- Necesitas un snippet de migración SQL para una tabla nueva o campo nuevo

## Clientes disponibles

### En Server Components y Server Actions
```ts
import { createServerClient } from '@/lib/supabase/server';

// Siempre con await — lee cookies del request
const supabase = await createServerClient();
```

### En Client Components (solo lectura en tiempo real o auth state)
```ts
import { createBrowserClient } from '@/lib/supabase/client';

const supabase = createBrowserClient();
```

**Regla:** Toda mutación de datos va en Server Actions, nunca directamente desde el cliente.

## Modelo de datos de referencia

```
profiles(id, full_name, currency, avatar_url, created_at)
months(id, user_id, year, month, total_income, created_at)
income_sources(id, month_id, label, amount)
expense_categories(id, user_id, name, color, icon)
expenses(id, month_id, category_id, amount, description, date)
pockets(id, month_id, name, assigned_amount, used_amount)
reminders(id, user_id, name, amount, day_of_month, active)
```

## Patrones de query

### Lectura con join
```ts
const { data, error } = await supabase
  .from('months')
  .select(`
    id, year, month, total_income,
    income_sources(id, label, amount),
    expenses(id, amount, description, date, expense_categories(name, color))
  `)
  .eq('user_id', user.id)
  .eq('year', year)
  .eq('month', month)
  .single();
```

### Inserción
```ts
const { data, error } = await supabase
  .from('expenses')
  .insert({
    month_id: monthId,
    category_id: categoryId,
    amount,
    description,
    date: new Date().toISOString(),
  })
  .select()
  .single();
```

### Actualización
```ts
const { data, error } = await supabase
  .from('pockets')
  .update({ used_amount: newAmount })
  .eq('id', pocketId)
  .select()
  .single();
```

### Eliminación
```ts
const { error } = await supabase
  .from('reminders')
  .delete()
  .eq('id', reminderId);
```

## Estructura completa de una Server Action

```ts
'use server';

import { createServerClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import type { Database } from '@/lib/supabase/types';

// Schema de validación siempre presente
const expenseSchema = z.object({
  month_id: z.string().uuid(),
  category_id: z.string().uuid(),
  amount: z.number().positive(),
  description: z.string().min(1).max(200),
  date: z.string().datetime(),
});

type ExpenseInsert = Database['public']['Tables']['expenses']['Insert'];

export async function registrarGasto(
  input: z.infer<typeof expenseSchema>
): Promise<{ error: string } | { data: Database['public']['Tables']['expenses']['Row'] }> {
  // 1. Validar input
  const parsed = expenseSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.errors[0].message };

  // 2. Verificar sesión
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'No autorizado' };

  // 3. Ejecutar query
  const payload: ExpenseInsert = { ...parsed.data };
  const { data, error } = await supabase
    .from('expenses')
    .insert(payload)
    .select()
    .single();

  if (error) return { error: error.message };

  // 4. Revalidar la ruta afectada
  revalidatePath('/app/dashboard');
  return { data };
}
```

## Migración SQL de referencia

Cuando se necesite crear o modificar una tabla, seguir este patrón:

```sql
-- Crear tabla con RLS
create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  month_id uuid references public.months(id) on delete cascade not null,
  category_id uuid references public.expense_categories(id) on delete set null,
  amount numeric(12, 2) not null check (amount > 0),
  description text,
  date date not null,
  created_at timestamptz default now() not null
);

-- Activar RLS siempre
alter table public.expenses enable row level security;

-- Política de acceso: solo el dueño del mes puede ver/modificar sus gastos
create policy "Usuarios ven sus propios gastos"
  on public.expenses
  for all
  using (
    exists (
      select 1 from public.months
      where months.id = expenses.month_id
      and months.user_id = auth.uid()
    )
  );
```

## Reglas de calidad

- Siempre verificar sesión con `supabase.auth.getUser()` — nunca asumir que hay usuario
- Nunca filtrar solo por `user_id` en el cliente; RLS lo garantiza en el servidor
- Tipos siempre desde `Database['public']['Tables']['tabla']['Row | Insert | Update']`
- Después de toda mutación, llamar `revalidatePath()` con la ruta que muestra los datos actualizados
- Retornar `{ error: string } | { data: T }` — nunca `throw` desde una Action
