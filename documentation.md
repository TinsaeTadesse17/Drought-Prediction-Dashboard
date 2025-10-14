Drought Prediction Dashboard — Architecture & Framework

This document summarizes the architecture, framework, and key design decisions of the dashboard. It also includes lightweight visuals to help new contributors and stakeholders understand the system quickly.

Stack at a glance
- Framework: Next.js 15 (App Router, Server/Client Components, Route Handlers)
- Language: TypeScript
- Styling: Tailwind CSS + PostCSS, design tokens via CSS variables (light/dark)
- Maps: Leaflet with GeoJSON overlays
- Charts: Recharts
- Auth: NextAuth (Credentials) with role-based access
- Data: Prisma ORM + PostgreSQL
- State/UX: shadcn/ui (Radix), next-themes, clsx, tailwind-merge

High-level architecture
- App Router under `src/app` defines pages, layouts, and API route handlers (`app/api/*`).
- Server Components render data-backed UI and compose Client Components for interactivity.
- Client Components implement maps (Leaflet), charts (Recharts), and forms.
- API route handlers encapsulate server logic (validation, normalization) and call the data layer.
- Prisma models map domain entities to PostgreSQL; Prisma Client handles queries and migrations.
- Global UI theming is controlled via CSS variables resolved by Tailwind utilities.


flowchart LR
  A[Browser] <--> B[Next.js App Router]
  B -->|Server Components| C[UI Shell / Layouts]
  C -->|Client Components| D[Leaflet / Recharts]
  B -->|Route Handlers app/api/*| E[Domain Services]
  E -->|Prisma Client| F[(PostgreSQL)]
  B -->|NextAuth| G[Sessions / JWT]

Request flow (example: predictions)
sequenceDiagram
  participant U as User
  participant App as Next.js (App Router)
  participant API as /api/predictions
  participant Svc as Service Layer
  participant DB as PostgreSQL (Prisma)

  U->>App: GET /data
  App->>API: Server-side fetch
  API->>Svc: Validate & normalize inputs
  Svc->>DB: Prisma query (reads/aggregates)
  DB-->>Svc: Rows
  Svc-->>API: Normalized JSON
  API-->>App: Data
  App-->>U: Streamed HTML + hydration

Key directories
- `src/app/`: App Router pages, layouts, error boundaries, and route handlers (e.g., `api/*`).
- `components/`: Reusable UI and Client Components (map, charts, forms, shadcn/ui wrappers).
- `lib/`: Utilities (e.g., name normalization, helpers for permissions/data shaping).
- `hooks/`: Shared React hooks.
- `prisma/`: `schema.prisma` and optional seed scripts.
- `public/`: Static assets (images, icons, optional GeoJSON if not fetched remotely).
- `styles/` and `src/app/globals.css`: Global styles, CSS variables, Tailwind layer imports.

Mapping details
- Map is rendered with Leaflet in a Client Component for interactivity.
- GeoJSON features represent administrative areas (e.g., woredas) with normalized naming.
- Selection highlights a feature and `fitBounds` to focus. Hover/tooltip shows metadata.
- Choropleth coloring comes from predictions/severity classification; legend is role-aware.

Styling system
- Tailwind CSS is used for utilities and component composition.
- Global CSS variables define design tokens (background, foreground, border, etc.).
- Tailwind theme maps utilities (e.g., `bg-background`, `text-foreground`) to those variables.
- Dark mode via `class` strategy using `next-themes` (`<html class="dark">` toggle).

Auth & roles
- NextAuth (Credentials) provides session handling and JWT-based auth in App Router.
- Role metadata (e.g., `admin`, `regional_officer`, `woreda_officer`) gates routes and UI.
- Sensitive routes require session; middleware enforces login-first navigation.

Data layer
- Prisma schema models users, roles, datasets, predictions, and reports.
- Prisma Client provides typed queries and migrations.
- Environment variables configure the DB connection string.

Environment variables
- `DATABASE_URL` — PostgreSQL connection string
- `NEXTAUTH_URL` — Base URL for cookie/session callback handling
- `NEXTAUTH_SECRET` — Cryptographic secret for JWT/session

Local development
1) Install dependencies and run dev server.
2) Ensure a Postgres instance is available (local or remote) and `DATABASE_URL` points to it.
3) On first run, `prisma generate` will produce the Prisma Client. Sync schema with `prisma db push` if needed.

Error handling & UX
- App Router error boundaries: `error.tsx`, `not-found.tsx`, and `global-error.tsx` for robust UX.
- UI components surface validation and API errors using shadcn/ui toasts and inline messages.


