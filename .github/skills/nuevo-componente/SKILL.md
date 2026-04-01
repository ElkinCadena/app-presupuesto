---
name: nuevo-componente
description: "Genera la estructura correcta de un nuevo componente Next.js para este proyecto. Usar cuando necesito crear un componente de UI genérico (ui/) o de dominio (features/). Detecta si necesita 'use client' o puede ser Server Component."
argument-hint: "Nombre y descripción del componente. Ej: BudgetCard — muestra resumen de un mes"
---

# Nuevo componente — App de Presupuesto

## Cuándo usar
- Crear un componente nuevo en `src/components/ui/` o `src/components/features/`
- Necesitas que siga las convenciones exactas del proyecto

## Paso 1 — Determinar tipo de componente

Antes de escribir código, decide:

**¿Necesita `'use client'`?**
- SÍ: usa `useState`, `useEffect`, u otros hooks de estado/efecto; maneja eventos del DOM (`onClick`, `onChange`); usa Recharts u otra librería que requiera el navegador
- NO: solo recibe props y renderiza; lee datos desde el servidor; no tiene interactividad propia

**¿Va en `ui/` o `features/`?**
- `ui/` → componente genérico reutilizable en cualquier contexto (Button, Card, Badge, Input, Modal)
- `features/` → componente específico de dominio financiero (BudgetCard, ExpenseRow, PocketSummary, MonthChart)

## Paso 2 — Archivos a generar

### Server Component (sin `'use client'`)
```
src/components/[ui|features]/NombreComponente.tsx
```

### Client Component (con `'use client'`)
```
src/components/[ui|features]/NombreComponente.tsx
```

Si el componente tiene estilos complejos que Tailwind no cubre:
```
src/components/[ui|features]/NombreComponente.module.scss
```

## Paso 3 — Estructura del componente

### Server Component
```tsx
import { type FC } from 'react';

interface NombreComponenteProps {
  // props tipadas aquí
}

const NombreComponente: FC<NombreComponenteProps> = ({ ...props }) => {
  return (
    // JSX semántico, Tailwind para layout/utilidades
  );
};

export default NombreComponente;
```

### Client Component
```tsx
'use client';

import { type FC } from 'react';

interface NombreComponenteProps {
  // props tipadas aquí
}

const NombreComponente: FC<NombreComponenteProps> = ({ ...props }) => {
  // hooks aquí
  return (
    // JSX semántico, Tailwind para layout/utilidades
  );
};

export default NombreComponente;
```

## Reglas de calidad

- Props siempre con `interface`, nunca tipado inline en los parámetros
- Sin valores literales de color ni espaciado fuera de Tailwind o variables SCSS
- Accesibilidad: `aria-label` en interactivos sin texto visible, roles semánticos correctos
- Si el componente muestra datos monetarios: siempre formatear con `Intl.NumberFormat` en COP
- Sin `any`, sin `as unknown as T`
- Exportar como `default` desde el archivo del componente
