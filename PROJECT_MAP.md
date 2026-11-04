# PROJECT_MAP — 205 nömrəli məktəb digital platform

> Knowledge base for future sessions. Generated 02.11.2026 from repository inspection.
> **Legend:** ✅ verified (code read + automated test or build evidence) · 🟡 implemented, verified by code reading only (no automated test) · ⚠️ known issue · ❓ assumption / not inspectable.

---

## 1. Overview & objectives

A **school platform** for *Bakı şəhəri Rövşən İmanov adına 205 nömrəli tam orta ümumtəhsil məktəbi* (Baku). Not a commercial website. Three systems in one Next.js app, one domain, one auth system, one PostgreSQL (Supabase) database:

| System | Purpose |
|---|---|
| A. Official school website | Public information: about, leadership, teachers, documents, contact |
| B. News & media newsroom | Articles with editorial workflow, events calendar, photo/video gallery |
| C. Electronic student journal | Grades, attendance, timetable, homework, notifications, role dashboards |

UI language: **Azerbaijani only** (dates DD.MM.YYYY, 24h, Asia/Baku). Real school content source: `qezet-205-mekteb.html` / `.pdf` (school newspaper "Yeni Dövr 205"), photos in repo root.

**History:** v1 was started with opencode (≈2.7k lines, partly broken; archived in `_backup/pre-rewrite-2026-11-02.tar.gz` — ⚠️ contains old plaintext secrets, do not share). v2 (current, ≈10.9k lines TS/TSX in `src/`) was written 02.11.2026.

## 2. Technology stack (verified from `package.json`, configs)

| Layer | Technology |
|---|---|
| Framework | Next.js **15.5.28** App Router, React 19.0.0, TypeScript 5 (strict) |
| Styling | Tailwind CSS 4 (`@tailwindcss/postcss`), CSS variables in `src/app/globals.css`, light/dark via `next-themes` (class), scoped per route group by `src/components/ThemeScope.tsx` (keys in `src/lib/theme-keys.ts` — must stay outside the `"use client"` module because server layouts call them): public site + auth use key `205_public_theme`, `(app)` uses `205_dashboard_theme:<userId>` (no root ThemeProvider — nested next-themes providers are ignored) |
| Icons | `lucide-react` |
| DB | **PostgreSQL on Supabase** (since 03.11.2026; before: MySQL 8.4), driver `pg`, raw parameterized SQL (no ORM). `?` placeholders converted to `$n` in `src/lib/db.ts` / `src/lib/sql-params.ts` |
| Files | Supabase Storage private bucket `school-files` (`@supabase/supabase-js`, server-only secret key); local `STORAGE_DIR` fallback in dev |
| Validation | `zod` 3 (Azerbaijani error map in `src/lib/validation.ts`) |
| Passwords | `@node-rs/argon2` (Argon2id, m=19456, t=2, p=1) |
| Images | `sharp` (re-encode to WebP, strip EXIF) |
| Mail | `nodemailer` (dynamic import; SMTP optional) |
| Tests | `node:test` (unit with `--experimental-strip-types`; integration against real Postgres (`DATABASE_URL_TEST`) + `next start`; 40 tests incl. `05-smoke` page/CRUD sweep) |
| No | ORM, Redis, queue, CI, Docker, git repository (⚠️ folder is not under version control) |

Runtime environment (dev): Windows 10/11, project in **OneDrive** folder (⚠️ see §11), Node 22.

## 3. Folder structure (important parts only)

```
src/
  middleware.ts            Edge: CSRF cookie, CSP nonce + security headers, redirect to /login if no session cookie
  app/
    layout.tsx             Root: <html lang="az">, metadata from site_settings, Providers (theme, toast), nonce
    (site)/                Public website (SiteHeader/SiteFooter layout)
      page.tsx             Home: hero, stats, news, notices(category "resmi-elanlar"), events, director message, achievements, teachers, gallery, documents
      about, administration, teachers, teachers/[id], news, news/[slug], events, events/[slug],
      gallery, gallery/[slug], documents, contact, privacy, terms
    (auth)/                login, register (invitation code), forgot-password, reset-password, verify-email
    (app)/                 Authenticated area (AppShell sidebar). layout.tsx → requirePageUser()
      dashboard, profile, notifications, grades, journal, attendance, schedule,
      homework(+new,[id]), editorial(+new,[id]), reports
      admin/               layout.tsx → requirePagePermission("admin.access")
        page (dashboard), r/[resource] (generic CRUD), users(+[id]), invitations, parents,
        galleries/[id] (media), schedule (editor), settings, pages, audit, broadcast
    api/                   53 route.ts files (see §7)
    media/[...key]/        Public file server (storage/public)
    sitemap.ts, robots.ts, not-found.tsx, error.tsx, icon.png, apple-icon.png
  components/ ui/ (Button, Field, Feedback, Dialog, Toast, Pagination, FileUpload, ThemeToggle)
              site/ (SiteHeader, MainNav, SiteFooter, parts, GalleryGrid) · app/ (AppShell, nav, ArticleEditor, HomeworkForm, WeekGrid, news-status)
              admin/ResourceManager · charts/TrendChart
  config/  rbac.json (roles, permissions, role→permission map — single source of truth)
           admin-resources.ts (generic CRUD resource definitions; SQL identifiers only from here)
  lib/     db, env, http (route wrapper, AppError), csrf, rate-limit, audit, storage, mailer,
           markdown (safe renderer), format, slug, validation, utils
           auth/ session, password, permissions, guards · client/ api (CSRF-aware fetch), useSubmit
  server/  Business logic: access (data scoping/IDOR), grades, attendance, schedule, homework,
           news, content, accounts (invitations/registration/verification/reset), users, stats,
           notifications, settings, admin-crud, admin-guard
database/migrations/  001–012 *.sql (database/seeds/ is empty)
scripts/   db-migrate, admin-create, seed-content, import-newspaper, seed-dev, backup, restore, lib/{env,demo-data}
tests/     unit/ (3 files) · integration/ (run.mjs, helpers.mjs, 01-auth, 02-isolation, 03-features)
tools/     verify-windows.bat, grant-test-db.ps1 (MySQL-era helpers, obsolete)
supabase/  migrations/ (Postgres schema), seed.sql + setup.sql (generated), storage.sql, README.md
docs/      architecture, api, deployment (+backup/restore), security, testing, analysis, PRODUCTION_CHECKLIST
public/images/  logo-64/160.png, mekteb-bina.webp, og-default.jpg
storage/   Uploaded files (gitignored). storage-test/ used by integration tests.
```

## 4. Architecture & request flow

```
Browser → middleware.ts (no DB) ─┬→ Server Component page → src/server/* → Postgres (Supabase pooler)
                                 └→ /api/* → route() wrapper (src/lib/http.ts):
                                      CSRF+Origin (mutations) → getCurrentUser() (DB session)
                                      → permission check (RBAC) → zod parse → service → audit → JSON
```
- Response envelope: `{ok:true,data}` / `{ok:false,error:{code,message,fields?}}`; ZodError→422, dup→409, FK→409.
- Pages read data directly from `src/server/*`; interactive parts (journal grid, editors, CMS tables) are client components that only call the API.
- Authorization denial on pages → `notFound()` (404, hides existence). ⚠️ This requires **no `loading.tsx`** in `(app)`/`(site)` — streaming would turn 404 into 200 (fixed 02.11.2026; do not re-add loading.tsx above protected pages).
- All pages are dynamic (root layout reads `headers()` for nonce).

## 5. Database (PostgreSQL/Supabase — schema in `supabase/migrations/`, see `supabase/README.md`)

> 03.11.2026: ported 1:1 from MySQL (`database/migrations/` = frozen history). Values keep the MySQL-era shape: DATE/TIMESTAMP as strings, timestamptz rendered in Baku time, flags `smallint` 0/1, `COUNT` as number. RLS on every table with no policies (Data API closed). Tracking table `schema_migrations` (name + checksum).

44 tables + view `schedule_conflicts` + `migrations` (with checksum). Groups and key relations:

| Group | Tables | Key relations / notes |
|---|---|---|
| Identity & RBAC | `users`, `roles`, `permissions`, `role_permissions`, `user_roles` | `users.role` = cached primary role; source of truth is `user_roles`. RBAC rows synced from `rbac.json` on every migrate |
| Auth security | `sessions` (token_hash), `password_resets` (token = SHA-256), `email_verifications`, `login_attempts`, `rate_limits`, `invitations` (code_hash, role, student_id/teacher_id) | Tokens/codes never stored in plaintext |
| School structure | `school_years` (one `is_active`), `classes` (school_year_id, class_teacher_id→teachers, shift), `subjects`, `class_subjects` (class+subject+teacher+year = **teacher assignment**, basis of teacher permissions), `class_students` (history), `bell_times` |
| People | `teachers` (user_id nullable, phone_private/address_private **never public**), `students` (user_id nullable, class_id), `parents` (user_id), `parent_student` (PK parent+student) |
| Academics | `lessons` (unique class+day+period+year), `grades` (2–5, type formativ/ksq/bsq/ev/layihe/yekun, soft delete, created_by/updated_by), `attendance` (unique student+date+period; period 0 = daily), `homework` (+`homework_files`), `homework_submissions` |
| Newsroom | `news` (status draft/pending/approved/published/archived, contains_minors, consent_confirmed, gallery_id), `news_categories`, `news_revisions` (action, status_from/to), `news_authors` (legacy, unused) |
| Media & content | `events`, `galleries` (+consent flags, is_published), `gallery_images`, `gallery_videos` (YouTube/Vimeo id), `documents` (category code, file_id), `files` (storage_key, visibility public/private, purpose, owner), `leadership`, `achievements`, `useful_links`, `pages` (markdown by slug), `site_settings` |
| System | `notifications` (per user, entity refs), `audit_logs` (old/new JSON, IP, UA) |

Migrations: `supabase/migrations/0001–0008` (Postgres; `npm run db:migrate` or one-shot `supabase/setup.sql`). Each runs in a transaction; the runner refuses edited applied files and auto-enables RLS on any table missing it. `schedule_conflicts` view was not ported (unused by code). MySQL history: `database/migrations/001–012`.

## 6. Roles & permission matrix (from `src/config/rbac.json`)

Roles: SA super_admin · ScA school_admin · Dir director · Dep deputy_director · T teacher · CT class_teacher · ChE chief_editor · Ed editor · Au author · Ph photographer · St student · Pa parent

| Permission | SA | ScA | Dir | Dep | T | CT | ChE | Ed | Au | Ph | St | Pa |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `admin.access` | ✓ | ✓ | ✓ | ✓ |  |  | ✓ | ✓ |  | ✓ |  |  |
| `users.view` / `invitations.manage` | ✓ | ✓ | ✓ | ✓ |  |  |  |  |  |  |  |  |
| `users.manage` | ✓ | ✓ | ✓ |  |  |  |  |  |  |  |  |  |
| `roles.manage` | ✓ | ✓ |  |  |  |  |  |  |  |  |  |  |
| `school.manage`, `students.manage`, `teachers.manage`, `schedule.manage` | ✓ | ✓ |  | ✓ |  |  |  |  |  |  |  |  |
| `students.view_all`, `parents.link`, `schedule.view_all`, `grades.view_all`, `attendance.view_all`, `homework.view_all`, `reports.view`, `notifications.broadcast` | ✓ | ✓ | ✓ | ✓ |  |  |  |  |  |  |  |  |
| `grades.manage_own`, `attendance.manage_own`, `homework.manage_own` | ✓ | ✓ |  |  | ✓ | ✓ |  |  |  |  |  |  |
| `grades.manage_all` | ✓ | ✓ |  |  |  |  |  |  |  |  |  |  |
| `attendance.manage_all` | ✓ | ✓ |  | ✓ |  |  |  |  |  |  |  |  |
| `news.submit` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |  | ✓ |  |
| `news.edit_any` | ✓ | ✓ | ✓ |  |  |  | ✓ | ✓ |  |  |  |  |
| `news.review` | ✓ | ✓ | ✓ | ✓ |  |  | ✓ | ✓ |  |  |  |  |
| `news.publish` | ✓ | ✓ | ✓ |  |  |  | ✓ |  |  |  |  |  |
| `news.manage_categories` | ✓ | ✓ |  |  |  |  | ✓ |  |  |  |  |  |
| `media.upload` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |  |  |
| `events.manage` | ✓ | ✓ | ✓ | ✓ |  |  | ✓ |  |  |  |  |  |
| `gallery.manage` | ✓ | ✓ | ✓ |  |  |  | ✓ |  |  | ✓ |  |  |
| `documents.manage` | ✓ | ✓ | ✓ | ✓ |  |  |  |  |  |  |  |  |
| `content.manage`, `audit.view` | ✓ | ✓ | ✓ |  |  |  |  |  |  |  |  |  |
| `settings.manage` | ✓ | ✓ |  |  |  |  |  |  |  |  |  |  |

**Data scoping on top of permissions** (`src/server/access.ts`, mandatory for every academic query): student → self; parent → `parent_student`; teacher → `class_subjects` assignments (+ whole homeroom class if `classes.class_teacher_id`); `*.view_all` → all. Role assignment rule (`canAssignRole`): `super_admin` only by super_admin; elevated roles (school_admin, director) need `roles.manage`; nobody can change own roles/status.

## 7. API routes (53 handlers; full table in `docs/api/API.md`)

| Prefix | Purpose |
|---|---|
| `/api/auth/*` | login, logout, me, register (invitation), verify-email, resend-verification, forgot/reset/change-password, sessions, redeem (extra child for parent) |
| `/api/grades`, `/api/grades/[id]`, `/api/journal` | Grade list (scoped), bulk create, edit/soft-delete, journal sheet |
| `/api/attendance`, `/attendance/report` | Mark/read (period 0 homeroom, 1–8 lesson teacher), student history, class report |
| `/api/schedule`, `/schedule/lessons[/id]`, `/schedule/conflicts` | Weekly view, lesson CRUD with teacher/class/room overlap → 409 `SCHEDULE_CONFLICT` |
| `/api/homework/**` | CRUD, submissions, grading |
| `/api/teacher/assignments`, `/api/classes/[id]/students` | Teacher context, class roster (scoped) |
| `/api/editorial/**`, `/api/news` | Newsroom CRUD + `transition` (submit/request_changes/approve/reject/publish/unpublish/restore); public feed |
| `/api/uploads`, `/api/files/[id]`, `/media/*` | Upload (purpose-based perms, magic-byte MIME), private file (access check per request), public file |
| `/api/notifications[/read]`, `/api/reports/summary` | Own notifications; director stats |
| `/api/admin/r/[resource][/id|/bulk|/export]` | Generic CRUD for 14 resources: school-years, subjects, classes, assignments, teachers, students, news-categories, events, galleries, documents, leadership, achievements, links, bell-times |
| `/api/admin/{users,invitations,parent-links,settings,pages,galleries/*,audit,broadcast,options}` | Custom admin endpoints |

**Key data flows**
- *Invitation → account:* admin creates code (hash stored, code shown once) → `/register` → user + role + link (students.user_id / parent_student / teachers.user_id) in one transaction → verification email → login allowed only when `email_verified=1`.
- *Grade:* teacher (assignment checked) → `grades` insert + `audit_logs` → notifications to student + linked parents.
- *Article:* author draft → submit (notify editors) → editor approve → chief editor publish (blocked if `contains_minors && !consent_confirmed`) → notify all users → public `/news/[slug]` with NewsArticle JSON-LD.

## 8. Authentication & security mechanisms (✅ covered by integration tests unless marked)

- DB sessions: 32-byte token cookie (`q205_sid`, or `__Host-q205_sid` when `SITE_URL` is https), HttpOnly, SameSite=Lax; SHA-256 in DB; revoked on logout, password change/reset, deactivation, role removal.
- CSRF: double-submit cookie `q205_csrf` + `X-CSRF-Token` header + Origin/Referer same-site check (all mutations via `route()`).
- Rate limits (DB fixed window): login IP 30/10 min, login email 8/15 min, register 10/h/IP, forgot 3/h/email, uploads 60/h/user; account lock after 10 consecutive failures (15 min).
- Generic login error; dummy hash verification for unknown emails; `login_attempts` log.
- CSP with per-request nonce + `strict-dynamic`, X-Frame-Options, nosniff, Referrer-Policy, Permissions-Policy; HSTS + upgrade-insecure-requests only when `SITE_URL` is https.
- XSS: user text rendered via own escape-first Markdown renderer (`src/lib/markdown.ts`, unit-tested); JSON-LD `<` escaped.
- SQL: parameterized everywhere; generic CRUD identifiers whitelisted from config + regex; `strict()` zod schemas reject unknown columns; CSV export guards formula injection.
- Files: magic-byte detection, size limits (image 8 MB, PDF 15 MB, office 10 MB), images re-encoded to WebP (EXIF/GPS removed), stored outside `public/`, random names; private files served with sandbox CSP.
- Privacy: no public student profiles; teacher private fields excluded from public queries; minors' images/articles require consent flag before publishing (server-enforced).
- Admin creation only via interactive CLI `npm run admin:create` (no default passwords anywhere in code).

## 9. Deployment & hosting configuration

- Dev: `npm run dev` (runs `npm run clean` first via `predev` — OneDrive workaround). Database: `DATABASE_URL` (Supabase or local Postgres). Deployed on Vercel: `docs/deployment/SUPABASE_VERCEL.md`.
- Production: Vercel `205maktab-ten.vercel.app` (was 500 until DB configured — see SUPABASE_VERCEL.md). Self-hosting alternative: `docs/deployment/DEPLOYMENT.md` — Linux VPS (systemd + nginx) or Windows (NSSM/pm2 + IIS). `BUILD_STANDALONE=1` enables `output: "standalone"`. HTTPS required; `TRUST_PROXY=1` only behind a reverse proxy.
- Env vars (names only): `NODE_ENV, SITE_URL, DATABASE_URL, DATABASE_CA_CERT, DATABASE_SSL, DB_POOL_SIZE, DATABASE_URL_TEST, NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (unused), SUPABASE_SECRET_KEY, SUPABASE_STORAGE_BUCKET, STORAGE_DIR, SESSION_TTL_DAYS, PASSWORD_RESET_TTL_MINUTES, TRUST_PROXY, SMTP_*, MAIL_FROM, BACKUP_DIR, BACKUP_KEEP, PG_DUMP_PATH, PG_RESTORE_PATH, MYSQL_* (copy tool only)`. Secrets: DATABASE_URL, SUPABASE_SECRET_KEY, SMTP_PASSWORD — never `NEXT_PUBLIC_`.
- Backup: `npm run backup` (pg_dump custom format of `public` + copy of the Storage bucket, retention `BACKUP_KEEP`), `npm run restore -- --from=...` (pg_restore; asks `host/database` confirmation). One-time MySQL → Postgres copy: `npm run db:copy-mysql` (dry run) / `-- --apply`, then `npm run storage:upload`. ❓ Not yet executed on the real machine.

## 10. Implementation status

Verification evidence (02.11.2026, on the Windows machine): `tsc` 0 errors · unit 19/19 · `next build` OK (54 pages) · integration **28/28** (`test-results/integration.txt`). Integration tests cover the 7 mandatory privacy scenarios.

| Module | Status | Notes |
|---|---|---|
| Auth (login/logout/sessions/CSRF/rate limit/lockout) | ✅ | |
| Invitation registration, parent redeem | ✅ | |
| Email verification / password reset | 🟡 | Logic present; **SMTP not configured** → in production mails are not sent (dev prints links to console) |
| RBAC + data scoping (grades, attendance, homework, files) | ✅ | |
| Grades (bulk entry, edit, soft delete, audit, notifications) | ✅ API · 🟡 UI | Journal grid UI not exercised by automated tests |
| Attendance (daily/per lesson, reports) | ✅ API · 🟡 UI | |
| Timetable (CRUD, conflict detection, weekly views) | ✅ API · 🟡 UI | |
| Homework (files, submissions, grading) | ✅ | |
| Newsroom workflow + consent rule + revisions | ✅ | |
| Public site pages, SEO (sitemap, robots, JSON-LD, OG) | ✅ (HTTP 200 + structure) | Visual/responsive QA not done |
| Events calendar, gallery (lightbox, videos), documents | 🟡 | Rendering tested only for empty lists |
| Dashboards (student/parent/teacher/director), reports | 🟡 | `/api/reports/summary` ✅ |
| Admin CMS (generic CRUD, users, invitations, parents, schedule editor, settings, pages, audit, broadcast) | 🟡 | Access control ✅; UI flows manual only |
| Notifications (in-app) | ✅ | No email/SMS channel; "homework due" reminders generated only when dashboard is opened (no scheduler) |
| Real content seed, newspaper import | 🟡 | `seed:content` executed ✅; `import:newspaper` not confirmed run |
| Backup/restore | 🟡 | Not executed |
| Accessibility / responsive | 🟡 | Built in (labels, focus, skip link, dialogs); manual checklist in `docs/testing/TEST_REPORT.md` not done |

**Missing vs. original specification (not implemented):** email/SMS notifications; 2FA; teacher self-editing of own public profile; admin editing of user name/email (only roles/active status editable); Excel/PDF export (CSV only); bulk actions other than delete; per-page SEO for static pages; monthly/weekly report exports; scheduled jobs (cleanup, reminders); English UI (not required).

## 11. Known bugs, technical debt, risks

| # | Severity | Issue | Evidence / action |
|---|---|---|---|
| 1 | ~~High~~ ✅ fixed 03.11 | Per-IP limit became global when IP unknown | `enforceIp()` in `src/lib/rate-limit.ts` skips IP buckets when IP is `"local"`; per-email limits unchanged |
| 2 | **High** | v1 admin account `admin@qezet205.edu.az` (password was in v1 source) ❓ probably still exists and active in `db_school` | Run `npm run admin:disable-legacy` (check) then `-- --apply` (deactivate + revoke sessions) |
| 3 | High | SMTP not configured → invitation-registered users cannot verify email → cannot log in (production) | `.env` has no SMTP keys; `src/lib/mailer.ts` |
| 4 | ~~Medium~~ ✅ fixed 03.11 | Invitation dialog loaded only first 100 students | Debounced server search (`q`, 50 results) in `InvitationsClient.tsx` |
| 5 | Medium | Project lives in OneDrive → Next.js `EINVAL readlink .next` errors | Workaround `predev` clean; real fix: move to `C:\Projects\...` |
| 6 | Medium | No version control (not a git repo), no CI | Initialize git before further work |
| 7 | Medium | `npm audit`: 5 vulnerabilities (1 moderate, 4 high) not reviewed | Run `npm audit`, update non-breaking |
| 8 | Medium | No cleanup of `sessions`, `rate_limits`, `login_attempts`, `notifications` (publishing a news item inserts one notification per active user) | Add scheduled cleanup/retention |
| 9 | Low | Session lookup = 3 queries per request (cached per request via React `cache`) | Acceptable at school scale |
| 10 | Low | `_backup/*.tar.gz` contains v1 code with old secrets; `.env` keeps a commented old JWT secret | Keep private; rotate DB password if it was ever shared |
| 11 | Low | `experimental.serverActions` config unused; `news_authors` table unused; `users.role` duplicate of `user_roles` | Tech debt |
| 12 | Info | Grades use one 2–5 scale for all types (KSQ/BSQ not percentage) | Assumption — confirm with school |
| 13 | Info | Parent with children in different classes sees no "today's lessons" widget | `dashboard/page.tsx` |
| 14 | Medium | Vercel: uploads capped at 4 MB (function body limit 4.5 MB); larger needs direct signed uploads to Storage | `src/lib/storage.ts` LIMITS |
| 15 | Medium | Supabase Auth sign-ups were open (unused by app; no data access) — disable in dashboard | SUPABASE_VERCEL.md step 2 |
| 16 | Info | Vercel functions default to `iad1`; set region to match Supabase to avoid per-query transatlantic latency | SUPABASE_VERCEL.md step 5 |

Not inspectable from this session: live database contents (users, existing rows), the user's MySQL configuration, production hosting (none yet), visual rendering in browsers.

### Official Electronic Journal (Path B, implemented 03.11.2026)

- Full feasibility/architecture report (Phases 1–5, legal, threat model, schema draft): `docs/integration/OFFICIAL_JOURNAL_INTEGRATION.md`. Capability registry: `src/server/integrations/official-journal-capabilities.ts`; status API `GET /api/integrations/journal/status`. Phases 2–4 gated by IDDA / Ministry authorization.

- Files: `src/lib/official-url.ts` (URL whitelist), `src/lib/auth/official-access.ts` (who sees it), `src/server/official-journal.ts` (links, last-open, audit), `src/app/api/official-journal/open/route.ts`, `src/components/app/OfficialJournal{Link,Panel}.tsx`, `src/app/(app)/official-journal/page.tsx`; dashboard card; nav item; middleware + robots.
- Verified targets (03.11.2026): `https://jurnal.edu.az/login`, `https://digital.edu.az/auth/digital/login/{teacher,director}` → both hand off to `mygovid.gov.az`. No public API exists; nothing is fetched from them.
- Navigation only: no cookies/tokens/sessions touched, no authenticated state shown. Path A (mygov ID SSO) **not implemented** — needs official agreement.
- Internal journal renamed in UI to “Məktəbdaxili jurnal” with a not-official disclaimer.
- ❓ Open question: which portal the school's teachers actually use (jurnal.edu.az vs digital.edu.az) — both are shown; admin can change URLs in Sayt parametrləri.

### Redesign, general invite code, official content import (03.11.2026)

- White institutional design: tokens in `globals.css` (#FFFFFF bg, #172B45 ink, #2457A6 primary, #EAF2FC soft, #E5EAF0 lines, #D6AE64 gold), Inter (body) + Manrope (headings) via `next/font` (latin-ext). New logo/photo: originals in `assets/originals/`, optimized in `public/assets/{logo,images}/`, favicon `src/app/icon.png`.
- Header: contact strip + nav (desktop ≥1280px, drawer below; drawer rendered via portal because header `backdrop-filter` traps `position:fixed`). Homepage: 12 sections, empty ones hidden. New page `/achievements`.
- Password policy `src/lib/password-policy.ts` (`NEXT_PUBLIC_PASSWORD_POLICY=strong|digits`, build-time, checked in browser and server). General code `REGISTRATION_INVITE_CODE` → account with role `pending` and no `user_roles`; `REGISTRATION_AUTO_VERIFY=1` skips email verification. Tests: `06-general-invite`.
- `npm run import:official` imports bakimektebleri.edu.az/205 news + photos as **pending** news (contains_minors=1, consent 0) + unpublished galleries; dates exact only for the latest feed items, otherwise photo-upload time (approximate, noted in `review_note`). `--leadership` adds the 9 official leadership entries. Verified official facts in `SETTING_DEFS` defaults.

### Visual design (03.11.2026)

- Warm “paper” palette + deep navy + gold (`globals.css` tokens), display serif **Noto Serif Display** via `next/font/google` (downloaded at build time, self-hosted → CSP `font-src 'self'` unchanged; build needs internet once).
- Homepage: photo hero with serif headline, overlapping stats card, rounded news cards, about section with image, achievements band; header pill navigation + “Kabinet” button; footer with social links (text, no brand logos).

## 12. Recommended roadmap

1. **Stabilize environment:** move project out of OneDrive, `git init` + first commit (exclude `.env`, `storage`, `_backup`), review `npm audit`.
2. **Security hygiene:** deactivate v1 admin; fix per-IP limiter fallback (#1); configure SMTP and test verification/reset end-to-end.
3. **Usability fixes:** searchable student picker in invitations (#4); admin edit of user names/emails; bulk invitation generation per class (CSV export of codes).
4. **Real data onboarding:** school year, subjects, teachers, classes, assignments, bell times, timetable; students import (CSV) — currently manual one-by-one.
5. **Content:** run `import:newspaper`, confirm consents, publish; fill leadership photos/bios, mission/strategy pages.
6. **QA:** manual responsive/accessibility pass; add integration tests for admin CRUD flows and journal UI (Playwright is not installed — decide before adding).
7. **Operations:** scheduled backup + restore drill; cleanup job; production deployment per `docs/deployment/DEPLOYMENT.md` with HTTPS.
8. **Later:** email notifications, 2FA for staff, report exports (PDF/Excel), term/quarter grading periods.
