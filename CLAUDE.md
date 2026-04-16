# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Acuo is a full-stack gym management platform with:
- **Mobile app**: Cross-platform (React Native / Expo)
- **Web app**: Responsive for desktop and mobile (Next.js)
- **Backend server**: Express.js REST API (`apps/server`)
- **Database**: Supabase (PostgreSQL, Auth, Storage)
- **Payments**: Stripe (stub for MVP)
- **Email**: Mailchimp (stub for MVP)
- **Hosting**: Railway (MVP)

## Architecture

Three-tier: Frontends (mobile + web) → Express API server → Supabase

- Frontends use Supabase Auth client directly for login/register/session management
- All data operations go through the Express REST API at `/api/*`
- Frontends send Supabase JWT in `Authorization: Bearer` header to Express
- Express verifies JWT via Supabase, then enforces role-based access via middleware
- Express uses Supabase service role key (untyped client) — all validation done via Zod middleware

## Repository Structure

npm workspaces monorepo:
- `apps/server` — Express.js API server (`@acuo/server`)
- `apps/web` — Next.js web app (`@acuo/web`)
- `apps/mobile` — Expo/React Native app (`@acuo/mobile`)
- `packages/shared` — Shared types, Zod validators, constants (`@acuo/shared`)
- `supabase/` — Database migrations, config

## Build & Development Commands

```bash
npm install                    # Install all workspace dependencies
npm run build:shared           # Build shared package (must run before server/web)
npm run build:server           # Build Express server
npm run build:web              # Build Next.js web app
npm run build                  # Build all (shared → server → web)

npm run dev:server             # Start Express dev server (tsx watch, port 3001)
npm run dev:web                # Start Next.js dev server (port 3000)
npm run dev:mobile             # Start Expo dev server
```

## Database

Uses Supabase (PostgreSQL). Migrations live in `supabase/migrations/`.
```bash
supabase start                 # Start local Supabase
supabase db reset              # Reset and rerun all migrations
supabase migration new <name>  # Create new migration
```

## Deployment (Railway)

Two Railway services, each with its own `railway.json`:
- **Web service** (`apps/web/railway.json`): Builds shared + web, runs `next start`
- **API service** (`apps/server/railway.json`): Builds shared + server, runs `node dist/index.js`

Both services need env vars: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.
Web also needs `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_API_URL`.

## Stubs (replace for production)

- `apps/server/src/services/stripe.ts` — Stripe operations log to console
- `apps/server/src/services/mail.ts` — Email operations log to console
- `apps/server/src/routes/webhooks.ts` — Stripe webhook endpoint (logs events)

## Key Domain Concepts

- **Gyms**: Multi-tenant — each gym has its own plans, programs, classes, and members
- **Memberships/Plans**: Per-gym pricing with monthly/yearly/count-based billing
- **Programs**: Gym-specific programs containing calendar-based workouts
- **Workouts**: Titled exercises with format-specific stat tracking (Time, AMRAP)
- **Classes**: Recurring schedule with coach assignment, user sign-up, and check-in tracking
- **User roles**: Users belong to gyms with roles: member, coach, admin (can hold multiple). One row per role in `gym_members`.
- **Class occurrences**: Materialized from schedule rules — allows per-occurrence coach overrides and cancellations

## Coding Standards & Patterns

### Naming Conventions
- **Files**: kebab-case (`class-schedules.ts`, `workout-stats.ts`)
- **Functions/variables**: camelCase (`createGymSchema`, `requireAuth`)
- **Constants**: UPPER_SNAKE_CASE (`ROLES`, `MEMBER_STATUSES`)
- **Database tables/columns**: snake_case (`gym_members`, `class_schedules`)
- **Route exports**: `{resource}Routes` (`gymRoutes`, `classRoutes`)
- **Zod schemas**: `create/update{Resource}Schema` → inferred type `Create/Update{Resource}Input`

### Server Route Pattern
All routes follow the same middleware chain:
```typescript
router.post('/path', requireAuth, requireGymRole('admin'), validate(schema), async (req, res, next) => {
  try {
    // handler logic using supabase service role client
  } catch (err) { next(err); }
});
```
- `requireAuth` — verifies JWT, sets `req.user`
- `requireGymRole(...roles)` — checks `gym_members` for active role in gym
- `validate(schema)` — parses `req.body` against Zod schema from `@acuo/shared`
- Errors thrown as `AppError(statusCode, message)` or caught by `errorHandler` middleware

### Adding New Features

**New API endpoint:**
1. Add Zod schema in `packages/shared/src/validators/` and export from index
2. Create/update route file in `apps/server/src/routes/`
3. Register router in `apps/server/src/index.ts`
4. Run `npm run build:shared` before testing

**New database table:**
1. Create migration: `supabase migration new <name>`
2. Add table with RLS policies enabled
3. Update types in `packages/shared/src/types/`
4. Add route handlers and validators

**New web page:** Create `.tsx` in `apps/web/app/` following Next.js App Router conventions. Use `apiFetch` from `lib/api.ts` for data.

**New mobile screen:** Create `.tsx` in `apps/mobile/app/` following Expo Router conventions. Use `apiFetch` from `lib/api.ts` for data.

### Frontend Patterns
- **UI framework**: Tamagui components (YStack, XStack, Card, Button, etc.) + Tailwind for layout
- **Icons**: lucide-react
- **API calls**: Always use `apiFetch()` from `lib/api.ts` — it handles auth headers automatically
- **Auth routing**: Web uses Next.js middleware; mobile uses root layout `onAuthStateChange`
- **Route groups**: `(auth)` for login/register, `(app)` for protected pages
- **Client components**: `"use client"` directive, `useState` + `useEffect` for data fetching

### Shared Package
- Must be rebuilt (`npm run build:shared`) after changes before server/web can see updates
- Built with tsup (ESM + CJS output)
- Contains all Zod validators, TypeScript types, and domain constants
- Constants defined as `const` arrays with `as const`, types derived via index access

### Environment Variables
- **Server**: `.env` — `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `PORT`
- **Web**: `.env.local` — `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_API_URL`
- **Mobile**: `.env` — `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`, `EXPO_PUBLIC_API_URL`
