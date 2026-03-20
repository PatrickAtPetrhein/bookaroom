# Bookaroom Webapp

Employee office attendance planner with a shared company timeline.

## Features

- Magic link sign-in via Supabase Auth
- Employee self-managed office days (`/schedule`)
- Shared company timeline with realtime updates (`/timeline`)
- Row-level security so users can edit only their own attendance

## Tech Stack

- Next.js 16 (App Router)
- React 19
- Supabase (Auth + Postgres + Realtime)
- Tailwind CSS

## 1) Local Setup

1. Install dependencies:

```bash
npm install
```

2. Create local env file:

```bash
cp .env.example .env.local
```

3. Fill in `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=YOUR_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

4. In Supabase SQL editor, run the migration file:

`supabase/migrations/001_init_attendance.sql`

5. Start development server:

```bash
npm run dev
```

App runs at [http://localhost:3000](http://localhost:3000).

## 2) Smoke Checks

Run both checks before deployment:

```bash
npm run lint
npm run build
```

## 3) Production Deployment (GitHub Pages + Supabase)

1. Push this project to GitHub.
2. In repository settings:
   - Open **Pages** and set source to **GitHub Actions**.
   - Add repository secrets:
     - `NEXT_PUBLIC_SUPABASE_URL`
     - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. Ensure the SQL migration has been applied to your production Supabase project.
4. Push to `main`; the `Deploy to GitHub Pages` workflow will build and publish `out/`.
5. Your production URL will be:
   - `https://<github-username>.github.io/<repo-name>/`

### Supabase Auth URL allow-list

In your Supabase project auth settings, allow your GitHub Pages URL:

- `https://<github-username>.github.io/<repo-name>/`

## Notes

- Default `company_id` for new users is currently fixed in `lib/auth-client.ts` for MVP bootstrap.
- Realtime timeline updates rely on `attendance_days` being added to `supabase_realtime` publication in the migration.
