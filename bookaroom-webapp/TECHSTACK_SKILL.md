# Bookaroom Tech Stack Skill

Use this as project context when answering questions or generating code for this repository.

## Core Stack

- Framework: Next.js 16 (App Router), static export mode for GitHub Pages.
- UI: React 19 + React DOM 19.
- Language: TypeScript 5.
- Styling: Tailwind CSS 4.
- Backend services: Supabase (Auth, Postgres, Realtime).
- Runtime model: Client-first app logic for auth/session and Supabase reads/writes.

## Libraries In Use

- `next`, `react`, `react-dom`
- `@supabase/ssr`, `@supabase/supabase-js`
- `@radix-ui/react-tabs`
- `class-variance-authority`, `clsx`, `tailwind-merge`, `tw-animate-css`
- `lucide-react`

## UI Conventions

- Prefer existing UI components under `components/ui/*` (shadcn-style component primitives).
- Default to shadcn-style primitives and Radix-based behavior; do not introduce `@base-ui/react`.
- Reuse utility helpers from `lib/utils.ts` (`cn`) for class composition.
- Keep UI pages in `app/*` and route-specific client logic in colocated `*-client.tsx` files.
- Keep typography sans-serif by default (Geist Sans via `next/font` + `font-sans`), avoid serif fonts unless explicitly requested.

## Data + Auth Conventions

- Supabase browser client lives in `lib/supabase/client.ts`.
- Shared auth/profile bootstrap for client routes lives in `lib/auth-client.ts`.
- Attendance logic and date helpers live in `lib/attendance.ts`.
- Default user flow:
  - `app/page.tsx` routes user to `/login` or `/schedule`
  - `/schedule` and `/timeline` require signed-in user via client-side Supabase user check

## Deployment Constraints

- Hosting target: GitHub Pages (no server runtime).
- Next config requirements: static export (`output: "export"`), `basePath` support via `NEXT_PUBLIC_BASE_PATH`.
- Avoid Next.js server-only features in this project:
  - Route handlers for core app flow
  - Server actions for auth flow
  - Middleware/proxy-dependent session handling

## Environment Variables

- Required:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Project/deploy:
  - `NEXT_PUBLIC_SITE_URL`
  - `NEXT_PUBLIC_BASE_PATH` (set in GitHub Pages workflow)

## What To Optimize For

- Keep features compatible with static hosting.
- Prefer client-side Supabase interactions for auth and data operations.
- Preserve existing architecture and naming patterns unless explicitly asked to refactor.
