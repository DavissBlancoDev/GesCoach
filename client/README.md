# Cliente de GesCoach

Aplicación React + TypeScript construida con Vite, React Router, TanStack Query y Tailwind CSS.

## Desarrollo

Desde la raíz del proyecto:

```bash
pnpm dev
```

O solo el cliente:

```bash
cd client
pnpm install --frozen-lockfile
pnpm dev
```

El cliente se sirve en `http://localhost:5173` y redirige las peticiones `/api` al servidor de desarrollo.

## Comandos

| Comando | Uso |
| --- | --- |
| `pnpm dev` | Servidor Vite con recarga en caliente |
| `pnpm build` | Comprueba TypeScript y genera la aplicación de producción |
| `pnpm lint` | Ejecuta ESLint |
| `pnpm preview` | Sirve localmente la compilación de producción |

## Estructura principal

- `src/pages/`: portada, autenticación, dashboard, plantilla, entrenos, partidos y calendario.
- `src/components/`: componentes reutilizables, incluyendo convocatoria, alineación, eventos y layout del equipo.
- `src/api/`: clientes tipados para las rutas del servidor.
- `src/hooks/`: consultas y mutaciones de TanStack Query.
- `src/lib/`: cálculos y reglas compartidas del cliente, como calendario, puntos y estadísticas.

La documentación general del proyecto está en [README.md](../README.md) y la navegación detallada en [docs/pantallas-y-navegacion.md](../docs/pantallas-y-navegacion.md).
