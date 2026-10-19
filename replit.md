# LiveArena

LiveArena is a Portuguese-language control panel for configuring interactive games that respond to TikTok LIVE events.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/livearena` — browser-based admin panel
- `artifacts/api-server` — shared Express API
- `lib/api-spec/openapi.yaml` — API contract and code generation source
- `lib/db/src/schema` — PostgreSQL data model (Drizzle)

## Architecture decisions

- The LiveArena panel uses the existing Express and PostgreSQL/Drizzle workspace stack.
- Admin access is a single environment-configured account with a signed, HttpOnly session cookie.

## Product

The first milestone establishes the admin sign-in, panel shell, and persistent data model. The later milestones add the game registry, match management, TikTok LIVE provider, simulator, and Batalha de Votos.

## User preferences

- Keep all interface text in Brazilian Portuguese.
- Stop and show the result at the end of each implementation milestone.

## Gotchas

- After changing `lib/api-spec/openapi.yaml`, run API codegen before using the generated hooks or schemas.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
