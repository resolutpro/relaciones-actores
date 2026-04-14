# Mapa Corporativo

A full-stack SPA for mapping, managing, and visualizing relationships between corporate actors. Built in Spanish.

## Architecture

- **Monorepo**: pnpm workspaces
- **Backend**: Express + SQLite (Node.js 24 built-in `node:sqlite`) at port 8080
- **Frontend**: React + Vite at `/` (port assigned via `$PORT`)
- **API Spec**: OpenAPI 3.0 with Orval codegen (Zod schemas + React Query hooks)

## Key Features

1. **Authentication**: Session-based via `ADMIN_USER`/`ADMIN_PASS` env vars (defaults: `admin`/`admin`)
2. **Mapa de Actores**: Leaflet map centered on Spain with color-coded relationship markers + spiral jitter for overlapping coords
3. **Actores CRUD**: Create/edit/delete actors with name, sector, lat/lon, and custom key-value fields
4. **Relaciones CRUD**: Create/edit/delete relationships with 0–1 score slider and comments
5. **Red de Relaciones**: Force-directed 2D network graph (react-force-graph-2d) showing radial layout
6. **Exportar**: Download full JSON export of all actors and relationships

## Packages

### `artifacts/api-server`
- Express 5, express-session, pino, cors
- Uses `node:sqlite` (built-in, no native compilation needed)
- DB file: `artifacts/api-server/database.sqlite`

### `artifacts/frontend`
- React 19, Vite 7, Tailwind CSS 4, wouter
- react-leaflet, leaflet, react-force-graph-2d
- @tanstack/react-query, lucide-react
- UI components from shadcn/ui (Radix UI)

### `lib/api-spec`
- OpenAPI spec at `lib/api-spec/openapi.yaml`
- Orval codegen generates hooks into `lib/api-client-react/src/generated/api.ts`

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `ADMIN_USER` | `admin` | Admin username |
| `ADMIN_PASS` | `admin` | Admin password |
| `SESSION_SECRET` | `mapa-corporativo-secret-key` | Express session secret |
| `DATABASE_PATH` | `../database.sqlite` | SQLite DB path |
| `PORT` | — | Frontend port (assigned by Replit) |
| `BASE_PATH` | — | Frontend base path (assigned by Replit) |

## Map Color Coding

When an actor is selected as "principal":
- **Blue**: The selected actor itself
- **Red** (score ≥ 0.75): High relationship
- **Orange** (score ≥ 0.4): Medium relationship
- **Yellow** (score < 0.4): Low relationship
- **Gray**: No relationship recorded

## Development

```bash
# Run API server
pnpm --filter @workspace/api-server run dev

# Run frontend
pnpm --filter @workspace/frontend run dev

# Regenerate API hooks from OpenAPI spec
pnpm --filter @workspace/api-spec run codegen
```
