# Supabase database — 205 nömrəli məktəb platforması

PostgreSQL schema for the platform. It is a faithful port of the 12 MySQL migrations in `database/migrations/`
(kept, frozen, for history), not a new design. 44 application tables plus `schema_migrations`.

## Architecture in one paragraph

The browser never talks to Supabase. All reads and writes run on the Next.js server (`src/server/*`), which
enforces session auth, RBAC (`src/config/rbac.json`) and per-row data scoping (`src/server/access.ts`:
student → self, parent → linked children only, teacher → assigned class/subject, `*.view_all` → all).
The server connects through the Supabase **transaction pooler** as the table owner. The Supabase Data API
(PostgREST) is closed: RLS is enabled on every table with **no policies** for `anon`/`authenticated`, and all
grants to those roles are revoked. The publishable key therefore cannot read or write any row.
Files live in a **private** Storage bucket (`school-files`) and are served only through the app's
`/media/*` (public files) and `/api/files/:id` (permission-checked) routes.

## Files

| File | Purpose |
|---|---|
| `migrations/0001_extensions_and_helpers.sql` | DB timezone (Asia/Baku), `baku_today()`, `baku_now()`, `set_updated_at()` trigger fn |
| `migrations/0002_identity_and_auth.sql` | roles, permissions, users, user_roles, sessions, password_resets, email_verifications, login_attempts, rate_limits |
| `migrations/0003_school_structure_and_people.sql` | school_years, subjects, teachers, classes, students, parents, parent_student, class_subjects, class_students, bell_times, invitations |
| `migrations/0004_academic_records.sql` | lessons, grades, attendance, files, homework, homework_files, homework_submissions |
| `migrations/0005_newsroom_and_media.sql` | news_categories, news_authors, galleries, news, news_revisions, events, gallery_images, gallery_videos, documents, leadership, achievements, useful_links, pages |
| `migrations/0006_notifications_audit_settings.sql` | notifications, audit_logs, site_settings |
| `migrations/0007_updated_at_triggers.sql` | `updated_at` triggers (MySQL `ON UPDATE CURRENT_TIMESTAMP`) |
| `migrations/0008_row_level_security.sql` | RLS on all tables, revoke API-role grants (current + default privileges) |
| `seed.sql` | Roles, permissions, role→permission map (generated from `rbac.json`) and default bell times. **No demo users, no passwords.** |
| `setup.sql` | Everything above in one transaction, for the SQL Editor. Generated: `npm run supabase:bundle` |
| `storage.sql` | Creates the private `school-files` bucket (Supabase only) |

Design notes
- IDs stay `integer` identity (not UUID): existing URLs (`/teachers/12`), API contracts and the MySQL data
  copy depend on them. Users are not linked to `auth.users` because the app keeps its own tested auth
  (Argon2id + server sessions + CSRF + lockout); Supabase Auth is not used.
- 0/1 flags are `smallint` with `CHECK (x IN (0,1))`, preserving the app's existing contract.
- Enums are `varchar` + `CHECK`. Grades: `smallint CHECK 2..5`. Timestamps: `timestamptz`; event times are
  Baku wall-clock `timestamp(0)` (same as MySQL `DATETIME`).
- Emails are stored lowercase (`CHECK (email = lower(email))` + `UNIQUE`).
- Single school per deployment: the school is the Supabase project, so there is no `school_id` column.
  A multi-school setup would need a new migration that adds it to every school-owned table.

## Applying (choose ONE path, never mix them on the same database)

**A. SQL Editor (no local tools):**
1. Supabase Dashboard → SQL Editor → New query → paste all of `setup.sql` → Run.
   It is one transaction: on any error nothing is kept. If the DB is already set up it refuses and changes nothing.
2. New query → paste `storage.sql` → Run.

**B. From your computer (needs `DATABASE_URL` in `.env`):**
```bash
npm run db:migrate
```
Applies only migrations not yet recorded in `schema_migrations`, each in its own transaction, then syncs RBAC.
It stops if an already-applied file was edited. After path A, `db:migrate` recognises everything as applied.

Later schema changes: add `supabase/migrations/0009_<name>.sql` (never edit an applied file), include
`ALTER TABLE ... ENABLE ROW LEVEL SECURITY` for every new table, run `npm run supabase:bundle`, then `npm run db:migrate`.

**Existing MySQL data (optional, one time):** with the old MySQL server running and `DATABASE_URL` set:
```bash
npm run db:copy-mysql
```
That is a dry run listing row counts. Then:
```bash
npm run db:copy-mysql -- --apply
```
```bash
npm run storage:upload
```
The copy refuses to write into a non-empty database and is all-or-nothing.

## Verification queries (SQL Editor)

```sql
-- 1. All migrations recorded (expect 8 rows)
SELECT name, executed_at FROM public.schema_migrations ORDER BY name;

-- 2. RLS enabled everywhere (expect 0 rows)
SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND NOT rowsecurity;

-- 3. No RLS policies that could open data (expect 0 rows)
SELECT tablename, policyname, roles FROM pg_policies WHERE schemaname = 'public';

-- 4. No table privileges left for API roles (expect 0 rows)
SELECT table_name, grantee, privilege_type FROM information_schema.role_table_grants
 WHERE table_schema = 'public' AND grantee IN ('anon', 'authenticated');

-- 5. RBAC seeded (expect 12 roles, 34 permissions, 141 mappings at the time of writing)
SELECT (SELECT count(*) FROM roles) AS roles, (SELECT count(*) FROM permissions) AS permissions,
       (SELECT count(*) FROM role_permissions) AS role_permissions, (SELECT count(*) FROM bell_times) AS bell_times;

-- 6. Baku date helper
SELECT public.baku_today(), public.baku_now();

-- 7. Storage bucket is private (expect public = false)
SELECT id, public FROM storage.buckets WHERE id = 'school-files';
```

From outside, the publishable key must get nothing:
```bash
curl -s "https://skijahzkjlzhejrzomai.supabase.co/rest/v1/users?select=id" -H "apikey: <publishable key>"
```
Expected: an error (`permission denied for table users`, or `PGRST205` table not found), never rows.

## Rollback and recovery

- `setup.sql` and every `db:migrate` step are transactional, so a failed run leaves nothing behind. No migration
  contains `DROP`, `TRUNCATE` or destructive `CASCADE`.
- **Before production data exists**, a failed or unwanted setup can be undone by deleting the objects
  manually in the SQL Editor. Do this only on an empty database and only after review.
- **After data exists**, never roll back by dropping. Write a new forward migration (`0009_...`) that fixes
  the schema. For data loss, restore from a backup:
  - Supabase Dashboard → Database → Backups (daily backups on paid plans; PITR as an add-on), or
  - your own dumps: `npm run backup` (pg_dump custom format, public schema, plus a copy of the bucket) and
    `npm run restore -- --from=backups/<folder>`, which asks you to type `host/database` to confirm.
- Run `npm run backup` before every migration on a database that holds real data.
