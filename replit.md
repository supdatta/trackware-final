# Trackware

A project tracking and engineering intelligence app for engineers and managers. Tracks earned value metrics, team health, GitHub repository analytics, and more.

## Architecture

**Full-stack app with:**
- **Frontend**: React + Vite + TypeScript + Tailwind CSS + shadcn/ui
- **Backend**: Express.js (TypeScript) server with session-based auth
- **Database**: PostgreSQL (Replit-managed) via Drizzle ORM
- **Dev setup**: Vite runs on port 5000 (proxies `/api` to port 5001 Express server)
- **Production**: Express serves the built Vite assets on port 5000

## Key Files

- `server/index.ts` — Express server entry point
- `server/routes/auth.ts` — Auth endpoints (signup, signin, signout, /me)
- `server/routes/projects.ts` — Projects CRUD
- `server/routes/github.ts` — GitHub repo scanning (ported from Supabase Edge Function)
- `server/routes/gemini.ts` — Gemini AI role-hours suggestion (ported from Supabase Edge Function)
- `server/db.ts` — Drizzle ORM + PostgreSQL connection
- `shared/schema.ts` — Drizzle table definitions (users, projects)
- `src/hooks/useAuth.ts` — React auth hook using session-based API
- `drizzle.config.ts` — Drizzle Kit config
- `vite.config.ts` — Vite config with API proxy

## Running the App

```bash
npm run dev       # Starts both Express (port 5001) and Vite (port 5000)
npm run db:push   # Push schema changes to the database
npm run build     # Build frontend for production
```

## Environment Variables

- `DATABASE_URL` — PostgreSQL connection string (auto-set by Replit)
- `SESSION_SECRET` — Secret for express-session (optional, has dev default)
- `GEMINI_API_KEY` — Google Gemini API key (optional, falls back to 40 hrs/week)
- `GITHUB_TOKEN` — GitHub personal access token (optional, increases API rate limits)

## Migration Notes

This project was migrated from Lovable to Replit. The original used:
- Supabase Auth → replaced with session-based auth (bcrypt + express-session + PostgreSQL session store)
- Supabase Database → replaced with Replit PostgreSQL + Drizzle ORM
- Supabase Edge Functions (github-repo, gemini-role-hours) → ported to Express routes
- lovable-tagger → removed (Replit incompatible)

## Features

- **Landing page**: Marketing landing page with feature highlights
- **Auth**: Sign up / Sign in with email + password (session-based)
- **Projects**: Create/delete projects (GitHub repos or manual)
- **GitHub Tracker**: Scan public GitHub repos for metrics, health scores, commit activity
- **SPM Dashboard**: Software Project Metrics with earned value, health radar, team capacity
- **AI Role Hours**: Gemini-powered weekly hour recommendations per team member
