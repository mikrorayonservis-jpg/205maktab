# Deploying on Vercel + Supabase

Current target: `https://205maktab-ten.vercel.app` · Supabase project `skijahzkjlzhejrzomai`.
Schema details, verification queries and recovery: `supabase/README.md`.

## Why the site showed "Gözlənilməz xəta baş verdi"

Observed on 03.11.2026 (HTTP probes of the live deployment; Vercel logs were not accessible from this machine):

| Path | Status | Touches DB |
|---|---|---|
| `/`, `/news` | 500 (error page) | yes |
| `/api/news` | 500 `{"code":"SERVER_ERROR"}` | yes |
| `/login`, `/robots.txt`, `/images/*` | 200 | no (`getSettings()` swallows DB errors) |

The build succeeded; every request that queried the database failed. The app was written for a local
MySQL 8 server (`mysql2`, `DB_HOST`...), and a Vercel function has no MySQL to reach. The "Kod: 647309206" on
the page is Next.js's error digest (a hash for log lookup), not a cause. The exact runtime message
(`DB_HOST mühit dəyişəni təyin edilməyib` or a connection error) will be in Vercel → Deployments → the
deployment → Logs, searching for `647309206`.

The fix is the move to Supabase Postgres. Uploads also used the local disk, which is not persistent on
Vercel, so they now go to Supabase Storage.

## Environment variables (Vercel → Project → Settings → Environment Variables)

| Name | Production | Preview | Development | Secret | Value |
|---|---|---|---|---|---|
| `DATABASE_URL` | ✓ | ✓* | ✓* | **yes** | Supabase → Connect → **Transaction pooler** URI (port 6543), with the DB password filled in |
| `DATABASE_CA_CERT` | ✓ | ✓ | ✓ | no | Supabase → Database Settings → SSL Configuration → Download certificate (paste PEM text) |
| `SUPABASE_SECRET_KEY` | ✓ | ✓* | ✓* | **yes** | Supabase → Project Settings → API Keys → Secret key (`sb_secret_...`) |
| `NEXT_PUBLIC_SUPABASE_URL` | ✓ | ✓ | ✓ | no | `https://skijahzkjlzhejrzomai.supabase.co` |
| `SITE_URL` | ✓ | preview URL | `http://localhost:3000` | no | `https://205maktab-ten.vercel.app` (later: the school domain) |
| `TRUST_PROXY` | `1` | `1` | — | no | Vercel sets `X-Forwarded-For`; needed for per-IP rate limits |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASSWORD`, `MAIL_FROM` | ✓ | optional | — | `SMTP_PASSWORD` yes | Without SMTP, invited users cannot verify email and cannot log in |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | optional | optional | optional | no | Not used by the code today (no browser client). Harmless to set. |
| `NEXT_PUBLIC_PASSWORD_POLICY` | `digits` (testing) / `strong` | same | same | no | `digits` = exactly `NEXT_PUBLIC_PASSWORD_DIGITS` numbers (default 8). Build-time value: redeploy after changing. Switch back to `strong` before real use. |
| `REGISTRATION_INVITE_CODE` | e.g. `admin123` | — | — | **yes** | General registration code. Only allows sign-up; new accounts have **no role** until an admin assigns one. Leave empty to allow only personal invitation codes. |
| `REGISTRATION_AUTO_VERIFY` | `1` only while SMTP is missing | — | — | no | Skips email verification for general-code sign-ups. |

\* Preview deployments run the same server code. Pointing them at the production database lets
anyone with a preview link write real data. Prefer a separate Supabase project (or branch) for Preview,
or leave `DATABASE_URL` unset there.

Never prefix `DATABASE_URL` or `SUPABASE_SECRET_KEY` with `NEXT_PUBLIC_`: that would ship them to every browser.
Not needed on Vercel: `STORAGE_DIR`, `DATABASE_URL_TEST`, `MYSQL_*`, `BACKUP_*`, `BUILD_STANDALONE`.

## Steps

1. **Supabase, database:** SQL Editor → run `supabase/setup.sql`, then `supabase/storage.sql`. Then run the
   verification queries in `supabase/README.md`.
2. **Supabase, Auth hardening:** Authentication → Sign In / Providers → turn **off** "Allow new users to sign up".
   The app does not use Supabase Auth; sign-ups are open today (`disable_signup=false`, autoconfirm on).
   Such accounts can't read any data (verified), but there is no reason to allow them.
3. **First administrator:** locally, put `DATABASE_URL` in `.env` and run `npm run admin:create`
   (interactive; the password is never stored in a file). Optionally `npm run seed:content` (pages, categories,
   leadership placeholders) and `npm run import:newspaper` (articles land as *pending*, minors' consent not confirmed).
   If the old MySQL database has real data, copy it instead (`npm run db:copy-mysql`, then `npm run storage:upload`).
4. **Vercel:** add the variables above, then Deployments → ⋯ → **Redeploy**. Environment changes only apply to a
   new deployment, and a redeploy of the old commit will not contain this code. Push this branch first.
5. **Region:** Vercel functions run in `iad1` (US East) by default; the response headers show `iad1`. Each page
   runs several sequential queries, so put the functions in the Supabase region: Vercel → Settings → Functions →
   Region. The pooler hostname shows the Supabase region, e.g. `aws-0-eu-central-1` → `fra1`.
6. **Verify:**
   ```bash
   curl -s -o /dev/null -w "%{http_code}\n" https://205maktab-ten.vercel.app/
   ```
   ```bash
   curl -s https://205maktab-ten.vercel.app/api/news
   ```
   Expect `200` and `{"ok":true,...}`. Then log in as the admin, upload an image in a gallery, open it from the
   public page, and check Vercel → Logs for `[db]`/`[api]` errors.

## Platform limits to know

- **Uploads ≤ 4 MB on Vercel** (function request body limit is 4.5 MB). The app caps limits at 4 MB there and the
  UI shows a clear message; locally the old limits (image 8 MB, PDF 15 MB) still apply. Larger files need direct
  browser-to-Storage signed uploads, which are not implemented.
- Files above 4 MB (for example large PDFs copied from the old server) are served by a 60-second signed URL
  redirect after the permission check, because function responses are limited to 4.5 MB.
- Notifications for "homework due" are created when a dashboard is opened. There is no scheduler (as before).
