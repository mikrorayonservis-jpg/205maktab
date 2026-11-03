# CLAUDE.md — read this first

This is a **SCHOOL PLATFORM** for 205 nömrəli tam orta məktəb (Baku), not a generic commercial website.
It combines three systems in one Next.js 15 + PostgreSQL (Supabase) app: the **official school website**, an **educational news portal (newsroom)** and an **electronic student journal** (grades, attendance, timetable, homework).

**Before any architectural or cross-module change, read `PROJECT_MAP.md`.** It documents structure, database, roles/permissions, API, security mechanisms, status and known issues.

## Non-negotiable rules
1. **Student privacy is critical.** Never expose student personal data publicly (no public student profiles, no grades/attendance outside the access scope, no teacher private phone/address). Minors' photos/articles are published only with `consent_confirmed`.
2. **Access control lives on the server.** Every academic query must go through `src/server/access.ts` scoping; every API through `route()` in `src/lib/http.ts` (CSRF + session + permission + zod). Hiding a button is not security. Unauthorized pages must return 404 via `notFound()`.
3. **Do not break existing working functionality.** Inspect before modifying; respect the existing architecture (pages → `src/server/*` services; client components → `/api/*`; roles/permissions only in `src/config/rbac.json`; admin CRUD identifiers only in `src/config/admin-resources.ts`).
4. **Nothing is "done" without verification.** After significant changes run, at minimum: `npm run typecheck`, `npm run test:unit`, `npm run build`, `npm run test:integration` (requires a separate Postgres test DB in `DATABASE_URL_TEST`: localhost or a database named `*_test`). Test the affected modules; state clearly what was and was not verified.
5. **Database changes only via new numbered migrations** in `supabase/migrations/` (never edit applied ones; every new table must `ENABLE ROW LEVEL SECURITY`; then `npm run supabase:bundle`). `database/migrations/` is the frozen MySQL history — do not edit. Never drop or overwrite real data.
6. **No secrets in code or docs.** No default passwords; admin accounts only via `npm run admin:create`. Never print `.env` values.
7. **Do not re-add `loading.tsx`** above protected pages (streaming turns 404 into 200).
8. UI text is **Azerbaijani only** (DD.MM.YYYY, 24h, Asia/Baku). Do not copy code from external repositories.
9. **Official journal = navigation only (Path B).** Never touch official cookies/sessions/tokens, never show a fabricated "logged in" state, never scrape. mygov ID SSO (Path A) requires explicit user approval + official agreement.

## Quick reference
- DB: Supabase Postgres via `DATABASE_URL` (transaction pooler, server-only). Browser never talks to Supabase; Data API is locked (RLS, no policies). Files: private Storage bucket via `SUPABASE_SECRET_KEY`. See `supabase/README.md`, `docs/deployment/SUPABASE_VERCEL.md`.
- SQL is written with `?` placeholders; `src/lib/db.ts` converts to `$n`. Use Postgres syntax (`ON CONFLICT`, `ILIKE`, `baku_today()` for "today", `baku_now()` for event wall-clock times).
- Dev: `npm run dev` (auto-cleans `.next`; project currently in OneDrive — see PROJECT_MAP §11)
- Docs: `docs/` (API, deployment, backup/restore, security report, test report, production checklist)
- Demo data only for development: `seed:dev` (accounts `@demo.local`)
