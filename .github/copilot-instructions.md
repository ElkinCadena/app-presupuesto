# Instrucciones del proyecto — App de Presupuesto Personal

## ¿Qué es este proyecto?

Aplicación web de gestión financiera personal. Permite registrar ingresos mensuales,
gestionar gastos fijos, distribuir dinero en bolsillos/categorías, visualizar gráficas
de resumen y llevar historial de meses anteriores. Objetivo a mediano plazo: convertirse
en producto SaaS con modelo freemium.

---

## Stack

| Capa | Tecnología |
|------|-----------|
| Framework | Next.js 15 (App Router) |
| Lenguaje | TypeScript 5 — `strict: true` siempre |
| Estilos | Tailwind CSS v4 para layout/utilidades · SCSS Modules para componentes complejos |
| Backend / BD | Supabase (PostgreSQL + Auth + Realtime) |
| Auth | Supabase Auth — proveedores Google y GitHub |
| Gráficas | Recharts |
| Exportación | jsPDF (PDF) + ExcelJS (Excel) |
| Formularios | react-hook-form + zod |
| Hosting | Vercel |

---

## Arquitectura de carpetas

```
src/
  app/
    (auth)/               # Rutas públicas: /login
    (app)/                # Rutas protegidas: dashboard, meses, configuración
      layout.tsx          # Verifica sesión, renderiza nav/sidebar
    layout.tsx            # Root layout: providers, fuentes, metadata global
    globals.css
  components/
    ui/                   # Componentes genéricos reutilizables: Button, Card, Input…
    features/             # Componentes de dominio: BudgetCard, ExpenseRow, PocketSummary…
  lib/
    supabase/
      client.ts           # Cliente browser (createBrowserClient)
      server.ts           # Cliente server (createServerClient con cookies)
      types.ts            # Tipos generados desde el schema de Supabase
    utils.ts
  hooks/                  # Custom hooks: useMonthBudget, useCategories…
  types/                  # Interfaces de dominio del negocio
```

---

## Modelo de datos (Supabase / PostgreSQL)

```
profiles          — Extiende auth.users (nombre, moneda, avatar_url)
months            — Registro mensual (user_id, year, month, total_income)
income_sources    — Fuentes de ingreso del mes (salario, freelance, otros)
expense_categories— Categorías configurables por usuario
expenses          — Gastos (month_id, category_id, amount, description, date)
pockets           — Bolsillos de distribución (nombre, assigned_amount, used_amount)
reminders         — Recordatorios de pagos (nombre, amount, day_of_month, active)
```

---

## Convenciones del proyecto

### Componentes
- `'use client'` solo cuando se necesite interactividad (hooks, eventos DOM, Recharts, formularios)
- Server Components por defecto para todo lo que solo lee datos
- Archivos: `PascalCase.tsx`, hooks: `useCamelCase.ts`, utilidades: `camelCase.ts`
- SCSS Module (`*.module.scss`) para animaciones, pseudo-elementos o estilos que Tailwind no cubre limpiamente

### Datos y Server Actions
- Server Actions en `app/(app)/[feature]/actions.ts`
- Retornar siempre `{ error: string } | { data: T }` — nunca `throw` desde una Action
- Queries de Supabase siempre con tipos generados de `lib/supabase/types.ts` — nunca `any`
- RLS (Row Level Security) activada en todas las tablas — nunca filtrar por `user_id` solo en el cliente

### Formularios
- `react-hook-form` + `zod` para toda entrada de usuario
- Schema de validación en el mismo archivo que la Action o en `[feature]/schema.ts`

### TypeScript
- `strict: true` en `tsconfig.json` — sin excepciones
- Sin `any`, sin `as unknown as T` como atajo
- Interfaces para modelos de dominio, `type` para uniones y alias

---

## Comandos

```bash
npm run dev       # Servidor de desarrollo
npm run build     # Build de producción (corre tsc + next build)
npm run lint      # ESLint

# Regenerar tipos de Supabase (ejecutar cada vez que cambies el schema en Supabase)
npx supabase gen types typescript --project-id <PROJECT_ID> > src/lib/supabase/types.ts
```

---

## Variables de entorno

```bash
NEXT_PUBLIC_SUPABASE_URL=        # URL del proyecto Supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=   # Clave anon (pública, segura para el cliente)
SUPABASE_SERVICE_ROLE_KEY=       # NUNCA exponer al cliente — solo en Server Actions o API Routes
```
