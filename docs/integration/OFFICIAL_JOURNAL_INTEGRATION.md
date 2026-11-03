# Official Education Journal Integration — Feasibility, Architecture & Roadmap

**Module:** Official Education Journal Integration · **Project:** 205 nömrəli məktəb platforması (`205maktab.az`)
**Report date:** 03.11.2026 · **Status of work:** Phase 1 implemented; Phases 2–4 **blocked by external authorization** (not by our approval).

> Classification legend used throughout:
> **VERIFIED** · **NOT VERIFIED** · **REQUIRES MINISTRY CONFIRMATION** · **REQUIRES IDP CONFIRMATION** (mygov ID / SİMA operator) · **REQUIRES LEGAL REVIEW** · **UNSUPPORTED** · **TECHNICALLY IMPOSSIBLE (current conditions)**
>
> This document contains no credentials, secrets or personal data. Nothing here is legal advice; legal items must be confirmed by qualified Azerbaijani counsel.

---

## 0. Executive summary

| Question | Answer | Class |
|---|---|---|
| Can teachers/directors open the real official journal from our dashboard? | Yes — by navigation (new tab). Implemented. | VERIFIED |
| Is login on the official side done with mygov ID / SİMA? | Yes — `digital.edu.az` teacher/director entries hand off to `mygovid.gov.az/auth`; the page states it is for the Ministry's internal portal (“ETN Daxili Portalı”). | VERIFIED (03.11.2026, direct inspection) |
| Can our site offer “Login with mygov ID”? | mygov ID serves **240+ public and private** organizations' systems, so relying-party integration exists in principle; the onboarding process, protocol and claims are **not publicly documented**. | REQUIRES IDP CONFIRMATION |
| Would mygov ID login on our site log the user into the official journal automatically? | Only if the IdP keeps a central session and the official portal re-uses it — that is the IdP's/portal's behaviour, not something we control or can assume. | REQUIRES IDP CONFIRMATION |
| Can our backend read official grades/attendance/students? | No public or documented institutional API found. National Data Exchange (“Digital Bridge”) is described as **state-body to state-body** exchange. | REQUIRES MINISTRY CONFIRMATION |
| Can our dashboard write official grades/attendance? | No documented write capability or permission. | UNSUPPORTED |
| RPA / browser automation of the official portal? | Would require storing/replaying teacher identity (SİMA, QR) and is not authorized. | UNSUPPORTED — unsuitable for production |
| Recommended approach | Phase 1 (done) + formal requests to the Ministry and the mygov ID operator; keep official system as the single source of truth; keep local journal clearly labelled as internal. | — |

The owner's statement “every permission is granted” approves **our** work; it cannot grant the **Ministry's** data-access permission or the **identity provider's** client registration. Therefore Phases 2–4 are designed here (interfaces, schema, threat model, tests) but intentionally **not** connected to any invented endpoint.

---

## 1. Existing application architecture assessment (inspected, read-only, 03.11.2026)

| Area | Finding | Evidence |
|---|---|---|
| Framework | Next.js 15.5.28 App Router, React 19, TypeScript strict | `package.json`, `tsconfig.json` |
| DB | MySQL 8.4 via `mysql2/promise`, parameterized SQL, no ORM; 12 migrations (`001–012`), tolerant runner | `src/lib/db.ts`, `database/migrations/`, `scripts/db-migrate.mjs` |
| Tenancy | **Single school** — no `school_id` columns. Cross-school leakage is structurally impossible today; an official school identifier would be a configuration value, not a tenant key. | schema |
| Auth | Email + Argon2id (m=19456,t=2,p=1); DB sessions (SHA-256 token hash), cookie `__Host-q205_sid` on https; invitation-only registration; account lockout; per-email + per-IP (when IP known) rate limits | `src/lib/auth/*`, `src/server/accounts.ts`, `src/lib/rate-limit.ts` |
| CSRF | Double-submit cookie + `X-CSRF-Token` + Origin check, inside `route()` wrapper | `src/lib/http.ts`, `src/lib/csrf.ts` |
| RBAC | 12 roles / 34 permissions in `src/config/rbac.json`, synced on migrate; data scoping in `src/server/access.ts` (teacher scope from `class_subjects`) | |
| Audit | `audit_logs` (user, action, entity, old/new JSON, IP, UA) via `src/lib/audit.ts` | `008_system.sql` |
| Security headers | CSP nonce + `strict-dynamic`, `font-src 'self'`, HSTS on https | `src/middleware.ts` |
| Local journal | Grades 2–5 with types formativ/ksq/bsq/ev/layihe/yekun, attendance per period, schedule, homework | `011_academics_v2.sql`, `src/server/grades.ts` |
| Phase 1 module | `src/lib/official-url.ts`, `src/lib/auth/official-access.ts`, `src/server/official-journal.ts`, `src/server/integrations/official-journal-capabilities.ts`, `/api/official-journal/open`, `/api/integrations/journal/status`, `/official-journal` page, dashboard card | this release |

Conclusion: the module fits as a **bounded module inside the existing Next.js backend**. No second backend, no ORM, no DB engine change, no second authentication system is needed. A future IdP login would be an *additional login method* that creates the **same** local session.

## 2. Verified official portal URLs

| URL | Behaviour observed | Class |
|---|---|---|
| `https://jurnal.edu.az/login` | Single “digital login” entry button | VERIFIED (03.11.2026) |
| `https://digital.edu.az` (alias `www.reqemsal.edu.az`) — “Rəqəmsal məktəb” | National online platform of the Ministry; teacher module gives direct access to the e-journal | VERIFIED — [edu.gov.az](https://edu.gov.az/az/news-and-updates/21873-1) (page updated 28.01.2026) |
| `https://digital.edu.az/auth/digital/login/teacher` | Redirects to `https://mygovid.gov.az/auth` | VERIFIED (03.11.2026) |
| `https://digital.edu.az/auth/digital/login/director` | Redirects to `https://mygovid.gov.az/auth` | VERIFIED (03.11.2026) |
| “Müəllim” mobile app (Rəqəmsal məktəb) | Lesson planning, attendance, formative/summative entry; Baku schools first, nationwide in stages | VERIFIED — [edu.gov.az, 10.12.2025](https://edu.gov.az/az/news-and-updates/22662-1) |
| Which portal school #205 is required to use | Both shown; admin can change in *Sayt parametrləri* | REQUIRES MINISTRY CONFIRMATION (school administration) |
| Deep links to a specific class/lesson | None found | NOT VERIFIED |
| iframe embedding | Not authorized; we do not embed | UNSUPPORTED |

Support contacts shown in the UI: `reqemsal@tsii.edu.az`, 146-4, `portal.edu.az` (VERIFIED on the portal, 03.11.2026).

## 3. Verified identity-provider information

| Fact | Class | Source |
|---|---|---|
| “digital.login” continues under the name **mygov ID**; operated within IDDA (Innovation and Digital Development Agency) digitalization portfolio; provides access to systems of **240+ public and private organizations**; announced 28.10.2025 | VERIFIED | [idda.az](https://idda.az/en/news/digitallogin-will-continue-its-operations-under-the-new-name-mygov-id), [mincom.gov.az](https://mincom.gov.az/en/media-en/news/digitallogin-to-continue-as-mygov-id) |
| Sign-in methods on mygov ID page: QR (SİMA), SİMA İmza, Asan İmza, SİMA Token, ID-card number, BSXM e-signature, foreign-visitor account | VERIFIED (direct inspection 03.11.2026) | `mygovid.gov.az/auth` |
| SİMA İmza can be integrated by public and private partners (“integrate into any system”); process via sima.az / 157 | VERIFIED (existence) / NOT VERIFIED (process) | [mincom.gov.az](https://mincom.gov.az/en/projects/sima-new-generation-digital-signature) |
| Protocol (OAuth 2.0 / OIDC / SAML / proprietary), endpoints, scopes, claims, PKCE support, logout | NOT VERIFIED — no public developer documentation found | — |
| Relying-party onboarding requirements (contract, legal entity, domain, redirect URIs) | REQUIRES IDP CONFIRMATION | — |

## 4. Official authentication integration possibilities

1. **Path B — Redirect (implemented).** User authenticates on the official portal. Our site never sees credentials, tokens or session state.
2. **Path A — mygov ID as an additional login method on `205maktab.az`.** Feasible only after IDDA registers our application. The result is: *our* local session is created after *our* backend validates an IdP assertion. It does **not** by itself authorize anything on `jurnal.edu.az`. Whether the user then skips re-authentication on the official portal depends on the IdP's own central session (if it exists) — REQUIRES IDP CONFIRMATION.
3. **Account linking** must be explicit (logged-in local user starts linking → IdP round-trip → store `provider_subject`). Never by a user-typed FİN.

## 5. Required registration and approvals

| Approval | From | For | Status |
|---|---|---|---|
| Client/relying-party registration, redirect URIs, protocol docs, test environment | mygov ID operator (IDDA) | Phase 2 | REQUIRES IDP CONFIRMATION |
| Decision that a school website may consume official education data; data-exchange agreement; API docs; scopes | Ministry of Science and Education (system owner of the e-journal) | Phase 3 | REQUIRES MINISTRY CONFIRMATION |
| Explicit write permission + sandbox | Ministry | Phase 4 | REQUIRES MINISTRY CONFIRMATION |
| Registration of our information system processing personal data (Law 998-IIIQ Art. 15) and legal-basis analysis for minors' data | Competent executive body / counsel | Phases 2–4 (and arguably today) | REQUIRES LEGAL REVIEW |
| Internal: school director's written mandate to the site operator | School | All | Owner action |

Who to contact: Ministry — `edu.gov.az` contact page / e-journal support `reqemsal@tsii.edu.az`, 146-4; mygov ID / SİMA — `sima.az`, call centre 157 (per [mincom.gov.az](https://mincom.gov.az/en/projects/sima-new-generation-digital-signature)).

## 6. Official API availability

| Item | Class |
|---|---|
| Public REST/GraphQL API for jurnal.edu.az or digital.edu.az | UNSUPPORTED (none found) |
| Private institutional API for schools | NOT VERIFIED |
| National Data Exchange (“Digital Bridge”): 100+ systems of 70 institutions, presented 17.09.2024, described as exchange **between state bodies** | VERIFIED (existence) — [xeberler.az](https://xeberler.az/new/details/milli-melumat-mubadilesine-70-qurumun-100-den-cox-informasiya-sistemi-inteqrasiya-edilib--32398.htm); eligibility of a school website: REQUIRES MINISTRY CONFIRMATION |
| Webhooks / event subscriptions | UNSUPPORTED (none documented) |
| Batch export (CSV/Excel) from the official journal for schools | NOT VERIFIED |
| Undocumented endpoints observed in the portal's own front-end | **Not used, by policy** |

## 7. Data reading permissions

Students, classes, teacher assignments, timetables, grades, attendance, academic years — all **REQUIRES MINISTRY CONFIRMATION**. Even with access, minors' personal data processing needs a documented legal basis (Section 17). Teachers would see only their assigned classes; directors only school #205.

## 8. Data writing permissions

| Operation | Official support | Director approval | Reversible | Idempotency | Permanent record ID | Class |
|---|---|---|---|---|---|---|
| Add grade | unknown | unknown | unknown | unknown | unknown | UNSUPPORTED |
| Correct / invalidate grade | unknown (deletion must not be assumed) | unknown | — | — | — | UNSUPPORTED |
| Record / correct attendance | unknown | unknown | — | — | — | UNSUPPORTED |
| Lesson topics, homework, timetable, student-class assignment, official reports | unknown | unknown | — | — | — | UNSUPPORTED |

**Rule:** SSO authentication never implies write permission.

## 9. RPA / browser-automation assessment

| Check | Finding |
|---|---|
| Explicit Ministry permission for automation | None found |
| Authentication | mygov ID with SİMA QR / signature — a **personal biometric/e-signature act** of the teacher; automating it would mean impersonation or credential storage |
| MFA / identity checks | Present (SİMA) — must not be bypassed |
| Auditability | Official system would attribute robot actions to the teacher |
| Fragility | Any UI change breaks automation |
| Data exposure | Student data would flow through an automation host |

**Classification: UNSUPPORTED — unsuitable for production.** Not implemented, not prototyped.

---

## 10. Architecture (actual project)

```
                           TEACHER / DIRECTOR (browser)
                                     |
                    https://205maktab.az  (Next.js 15, single deployment)
                                     |
          +--------------------------+-----------------------------+
          |                          |                             |
   middleware.ts              route() wrapper                 RSC pages
   (CSP nonce, HSTS,          (CSRF → session →               (requirePageUser,
    PROTECTED redirect)        RBAC permission)                notFound on no access)
          |                          |                             |
          +------------+-------------+-------------+---------------+
                       |                           |
              Local school services       Official Journal Integration module
              src/server/*                src/server/official-journal.ts            [Phase 1 ✅]
              (grades, attendance,        src/server/integrations/
               schedule, homework…)         official-journal-capabilities.ts         [Phase 1 ✅]
                       |                    ── future, behind feature flags ──
                       |                    idp/adapter.ts (mygov ID)                [Phase 2 ⛔ IdP]
                       |                    journal/client.ts (official API)         [Phase 3 ⛔ Ministry]
                       |                    journal/outbox.ts (writes)               [Phase 4 ⛔ Ministry]
                       v                           |
                 MySQL 8.4  <---- mapping/sync tables (Phase 3+)
                                                   |
                           (Phase 1: browser navigation only, new tab)
                                                   v
                     jurnal.edu.az / digital.edu.az  →  mygovid.gov.az (SİMA / Asan İmza)
```

Module boundaries (names reserved; only Phase 1 parts exist): Identity Provider Adapter · Official Journal API Client · Teacher/School/Student Mapping · Grade/Attendance/Timetable services (official) · Sync Service (outbox + reconciler) · Audit (existing `audit()`) · Authorization (existing RBAC + `access.ts`) · Error Translation. The browser never calls an official API; all external calls go through the backend.

## 11. Database schema proposal (Phase 2+; **not migrated**)

Existing tables are reused: `users`, `teachers`, `students`, `classes`, `subjects`, `grades`, `attendance`, `audit_logs`. New tables only:

```sql
-- 013_official_integration.sql  (DRAFT — create only after Phase 2/3 approval)
CREATE TABLE identity_links (                       -- Phase 2
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  provider VARCHAR(30) NOT NULL,                    -- 'mygovid'
  provider_subject VARCHAR(191) NOT NULL,           -- opaque 'sub'; NOT the FİN
  status ENUM('active','revoked') NOT NULL DEFAULT 'active',
  verified_at TIMESTAMP NOT NULL,
  verification_method VARCHAR(40) NOT NULL,          -- 'logged_in_link_flow'
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_provider_subject (provider, provider_subject),
  UNIQUE KEY uq_user_provider (user_id, provider),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE official_mappings (                    -- Phase 3: one table, typed
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  entity_type ENUM('school','teacher','class','subject','student') NOT NULL,
  local_id INT UNSIGNED NOT NULL,
  official_id VARCHAR(100) NOT NULL,
  school_year_id INT UNSIGNED NULL,
  status ENUM('pending','verified','conflict','retired') NOT NULL DEFAULT 'pending',
  last_synced_at TIMESTAMP NULL,
  UNIQUE KEY uq_official (entity_type, official_id, school_year_id),
  UNIQUE KEY uq_local (entity_type, local_id, school_year_id)
);

CREATE TABLE official_records (                     -- Phase 3/4: mirror of official grades/attendance
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  kind ENUM('grade','attendance') NOT NULL,
  official_record_id VARCHAR(100) NULL,             -- NULL until the official system confirms
  student_id INT UNSIGNED NOT NULL, class_id INT UNSIGNED NOT NULL, subject_id INT UNSIGNED NULL,
  teacher_id INT UNSIGNED NULL, record_date DATE NOT NULL,
  assessment_type VARCHAR(30) NULL, value_text VARCHAR(20) NOT NULL,
  official_version VARCHAR(64) NULL,                -- ETag / revision from the official API
  sync_status ENUM('confirmed','pending','failed','conflict') NOT NULL,
  last_synced_at TIMESTAMP NULL,
  UNIQUE KEY uq_official_record (kind, official_record_id)
);

CREATE TABLE integration_outbox (                   -- Phase 4 only
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  idempotency_key CHAR(36) NOT NULL UNIQUE,
  operation VARCHAR(50) NOT NULL, payload JSON NOT NULL,   -- no tokens, minimal PII
  actor_user_id INT UNSIGNED NOT NULL, reason VARCHAR(500) NULL,
  status ENUM('pending','in_flight','confirmed','failed','dead','uncertain') NOT NULL DEFAULT 'pending',
  attempts TINYINT UNSIGNED NOT NULL DEFAULT 0, next_attempt_at TIMESTAMP NULL,
  last_error_code VARCHAR(60) NULL, official_request_id VARCHAR(100) NULL,
  correlation_id CHAR(36) NOT NULL, created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_outbox_due (status, next_attempt_at)
);

CREATE TABLE integration_sync_runs (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  scope VARCHAR(50) NOT NULL, started_at TIMESTAMP NOT NULL, finished_at TIMESTAMP NULL,
  status ENUM('running','success','partial','failed') NOT NULL,
  cursor_value VARCHAR(191) NULL, error_code VARCHAR(60) NULL, items INT UNSIGNED NOT NULL DEFAULT 0
);
```

- **Authoritative in the official system:** every field of `official_records` except `sync_status`/`last_synced_at`. Local metadata: mapping status, outbox, sync runs.
- **Local journal (`grades`, `attendance`) stays separate** and labelled “Məktəbdaxili” — never silently becomes or overwrites official data.
- **FİN:** not stored. If the Ministry's API requires it as a key, store only in `official_mappings.official_id` after legal review, encrypted (AES-256-GCM, key in secrets manager), access restricted, deleted at end of enrolment + retention period.
- **Audit:** reuse `audit_logs`; add `reason`, `correlation_id`, `official_request_id`, `official_status` columns (nullable) in Phase 4. Make tamper-evident with a hash chain column (`prev_hash`, `row_hash`) or append-only DB user (`INSERT` only grant).

## 12. Internal API design

| Route | Status | Auth / RBAC / scope | Notes |
|---|---|---|---|
| `POST /api/official-journal/open` | ✅ Phase 1 | session, CSRF, teacher/class_teacher/director/deputy; 60/h | Records `official_journal.open` audit only; `{target: "jurnal"\|"digital"}` |
| `GET /api/integrations/journal/status` | ✅ Phase 1 | session, same roles | Distinct facts: local session, IdP verified (false), last portal open, API authorized (false), sync (unsupported), capability registry |
| `GET /api/integrations/journal/configuration` | covered by `/admin/settings` (URLs validated to https + `*.edu.az`/`*.gov.az`) | `settings.manage` | — |
| `GET /api/integrations/mygov/authorize`, `/callback`, `POST /link`, `/unlink`, `GET /status` | ⛔ Phase 2 | authorize: public + rate limit; link/unlink: session + CSRF | Requires IdP docs; **not created** (no fake endpoints) |
| `GET/POST/PUT/DELETE /api/integrations/journal/{students,grades,attendance,timetable}` | ⛔ Phase 3/4 | session + RBAC (`grades.manage_own` etc.) + `access.ts` scope + official permission flag | Each returns 501 `INTEGRATION_NOT_AUTHORIZED` until enabled; DELETE grade only if the official API supports invalidation |
| `POST /api/integrations/journal/sync`, `GET .../sync/status`, `.../sync/history` | ⛔ Phase 3 | director / school_admin | Manual refresh + run history |

Response envelope stays `{ok, data | error:{code,message,fields}}`. Every write: zod schema → RBAC → scope → idempotency key → outbox → audit.

## 13. TypeScript examples (design only — **not executable** without official documentation and registration)

### 13.1 mygov ID callback (Authorization Code + PKCE, *if* the IdP supports OIDC)

```ts
// src/app/api/integrations/mygov/callback/route.ts  — DRAFT, Phase 2
import { NextRequest, NextResponse } from "next/server";
import { createRemoteJWKSet, jwtVerify } from "jose";           // to be added only in Phase 2
import { createSession } from "@/lib/auth/session";
import { audit } from "@/lib/audit";
import { idpConfig } from "@/server/integrations/idp/config";     // values from env; placeholders until IDDA issues them

export async function GET(req: NextRequest) {
  const cfg = idpConfig();                                        // throws if MYGOVID_* env vars absent
  const url = req.nextUrl;
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const tx = req.cookies.get("__Host-q205_oidc")?.value;          // sealed {state, nonce, verifier, next}, 10-min TTL
  const saved = tx ? await unseal(tx) : null;
  if (!code || !state || !saved || !timingSafeEqual(state, saved.state)) return fail("STATE_MISMATCH");

  const tokenRes = await fetch(cfg.tokenEndpoint, {               // endpoint comes from IdP discovery doc, never hard-coded guesses
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "authorization_code", code, redirect_uri: cfg.redirectUri,
      client_id: cfg.clientId, client_secret: cfg.clientSecret, code_verifier: saved.verifier }),
    signal: AbortSignal.timeout(8000),
  });
  if (!tokenRes.ok) return fail("TOKEN_EXCHANGE_FAILED");
  const { id_token } = (await tokenRes.json()) as { id_token?: string };
  if (!id_token) return fail("NO_ID_TOKEN");

  const { payload } = await jwtVerify(id_token, createRemoteJWKSet(new URL(cfg.jwksUri)), {
    issuer: cfg.issuer, audience: cfg.clientId, clockTolerance: 60,
  });
  if (payload.nonce !== saved.nonce) return fail("NONCE_MISMATCH");
  const sub = String(payload.sub);                                 // opaque subject — never the FİN as key

  const link = await findActiveLink("mygovid", sub);
  if (!link) return linkRequired(saved.next);                      // never auto-create or auto-link accounts
  const res = NextResponse.redirect(new URL(saved.next || "/dashboard", req.url));
  await createSession(link.userId, req, res);                      // existing session system; rotates token
  await audit({ userId: link.userId, action: "auth.login_mygovid", entityType: "user", entityId: link.userId, req });
  res.cookies.delete("__Host-q205_oidc");
  return res;                                                      // id/access/refresh tokens are NOT stored or sent to the browser
}
```

### 13.2 Official API client abstraction

```ts
// src/server/integrations/journal/client.ts — DRAFT, Phase 3
export interface OfficialJournalApi {
  listStudents(q: { classOfficialId: string; cursor?: string }): Promise<Page<OfficialStudent>>;
  listGrades(q: { classOfficialId: string; subjectOfficialId: string; since?: string }): Promise<Page<OfficialGrade>>;
  createGrade(cmd: CreateGradeCmd, idempotencyKey: string): Promise<{ officialId: string; version: string }>;
}

export class NotAuthorizedJournalApi implements OfficialJournalApi {  // the ONLY implementation shipped until access is granted
  private fail(): never { throw new IntegrationError("INTEGRATION_NOT_AUTHORIZED", 501); }
  listStudents() { return this.fail(); }
  listGrades() { return this.fail(); }
  createGrade() { return this.fail(); }
}

// HTTP adapter skeleton used once real docs exist
async function call<T>(op: string, init: RequestInit, schema: ZodType<T>): Promise<T> {
  const correlationId = crypto.randomUUID();
  return breaker.run(() => retry(async (attempt) => {
    const res = await fetch(endpointFor(op), { ...init, signal: AbortSignal.timeout(10_000),
      headers: { ...init.headers, Authorization: `Bearer ${await serviceToken()}`, "X-Correlation-ID": correlationId } });
    if (res.status === 429) throw new RetryableError("RATE_LIMITED", retryAfter(res));
    if (res.status >= 500) throw new RetryableError("OFFICIAL_UNAVAILABLE");
    if (!res.ok) throw translateOfficialError(res.status, await safeJson(res));   // → Azerbaijani user message
    const parsed = schema.safeParse(await res.json());
    if (!parsed.success) throw new IntegrationError("INVALID_OFFICIAL_RESPONSE", 502);
    return parsed.data;
  }, { retries: init.method === "GET" ? 3 : 0, baseMs: 400, jitter: true }));        // writes retried only via outbox with idempotency key
}
```

Logs pass through `redact()` (drops `authorization`, `token`, `fin`, names) before writing.

### 13.3 Student retrieval — returns `INTEGRATION_NOT_AUTHORIZED` today. A development-only mock may exist **only** under `tests/` and is never imported from `src/`.

### 13.4 Grade creation (Phase 4 flow)

```ts
export async function createOfficialGrade(user: CurrentUser, input: unknown, req: NextRequest) {
  const cmd = gradeSchema.parse(input);                         // value range from official rules, type enum from official API
  if (!capability("official_write").enabled) throw new IntegrationError("INTEGRATION_NOT_AUTHORIZED", 501);
  await assertTeacherTeaches(user, cmd.classId, cmd.subjectId); // existing access.ts → "Bu şagird sizin təyin olunduğunuz sinfə aid deyil."
  const key = idempotencyKey(user.id, cmd);                      // hash(student, subject, date, type) — duplicate → 409 "Bu qiymət artıq qeydə alınıb."
  await db.transaction(async (tx) => {
    await tx.execute("INSERT INTO integration_outbox (idempotency_key, operation, payload, actor_user_id, correlation_id) VALUES (?, 'grade.create', ?, ?, UUID())",
      [key, JSON.stringify(minimal(cmd)), user.id]);
    await audit({ userId: user.id, action: "official_grade.requested", entityType: "official_record", newValues: minimal(cmd), req }, tx);
  });
  return { status: "pending" };                                  // UI shows "Rəsmi sistemin təsdiqi gözlənilir" — never "saved" until confirmed
}
```

### 13.5 Grade correction — requires `expectedVersion`; mismatch → 409 “Məlumat rəsmi sistemdə dəyişdiyi üçün əməliyyat yenidən yoxlanılmalıdır.”; `reason` mandatory (min 10 chars); director approval step only if the official workflow defines one.

### 13.6 Grade deletion — not implemented. Only the operation the official API documents (e.g. invalidation with reason) would be exposed.

## 14. Validation & error handling

| Case | HTTP | Code | User message (az) |
|---|---|---|---|
| Student not in teacher's classes | 403 | `SCOPE` | Bu şagird sizin təyin olunduğunuz sinfə aid deyil. |
| Grade out of range | 422 | `VALIDATION` | Daxil etdiyiniz qiymət icazə verilən aralıqda deyil. |
| Duplicate grade | 409 | `DUPLICATE` | Bu qiymət artıq qeydə alınıb. |
| Invalid date (future / closed period) | 422 | `VALIDATION` | Tarix düzgün deyil və ya bu dövr bağlanıb. |
| Duplicate attendance | 409 | `DUPLICATE` | Bu dərs üçün davamiyyət artıq qeyd olunub. |
| Not permitted | 403 | `FORBIDDEN` | Bu əməliyyat üçün lazımi icazəniz yoxdur. |
| Session expired | 401 | `UNAUTHENTICATED` | Sessiyanın vaxtı bitib. Yenidən daxil olun. |
| IdP state/nonce/issuer/audience/expiry invalid | 400 | `IDP_INVALID` | Rəsmi girişi təsdiqləmək mümkün olmadı. Yenidən cəhd edin. |
| Official API timeout / down | 503 | `OFFICIAL_UNAVAILABLE` | Rəsmi sistemə bağlantı müvəqqəti olaraq mümkün deyil. |
| Rate limited | 429 | `RATE_LIMITED` | Çox sayda sorğu göndərildi. Bir az sonra yenidən cəhd edin. |
| Version conflict | 409 | `CONFLICT` | Məlumat rəsmi sistemdə dəyişdiyi üçün əməliyyat yenidən yoxlanılmalıdır. |
| Not found | 404 | `NOT_FOUND` | Qeyd tapılmadı. |
| Partial sync | 207-like body | `PARTIAL` | Məlumatların bir hissəsi yenilənmədi. Son uğurlu yenilənmə: … |
| Invalid official response | 502 | `INVALID_OFFICIAL_RESPONSE` | Rəsmi sistemdən gözlənilməyən cavab alındı. |
| Integration not authorized (today) | 501 | `INTEGRATION_NOT_AUTHORIZED` | Bu funksiya rəsmi icazə verildikdən sonra aktivləşəcək. |

Stack traces, SQL errors, tokens and personal data are never returned (existing `route()` error handler already enforces this).

## 15. Synchronization strategy (Phase 3+)

- **Webhooks:** only if documented; verify HMAC signature + timestamp window + replay cache. Currently UNSUPPORTED.
- **Polling:** incremental by cursor/`updatedSince`, every 15 min during school hours (08:00–18:00 Asia/Baku), nightly full reconcile per class; respect `Retry-After`; page size per API limits.
- **Manual refresh:** director button → `POST /sync`, rate-limited 1/5 min per scope.
- **UI freshness:** “Son uğurlu yenilənmə”, “Son cəhd”, “Gözləyən əməliyyatlar”, “Xəta” — each a separate field.
- **Outbox:** idempotency key, max 6 attempts with exponential backoff + jitter, `dead` after that (director notified); after a timeout the record becomes `uncertain` and is reconciled by reading back before any retry.
- **Conflicts:** official system wins. A record changed officially after our read → our write fails with `CONFLICT`; the user sees both values and re-applies consciously. Two teachers on the same record → version check. Never silently overwrite a newer official record.

## 16. Security threat model (STRIDE-oriented; OWASP ASVS 4/5 & API Top 10 as references)

| Threat | Mitigation | Status |
|---|---|---|
| Phishing link planted in settings (open redirect to fake “official” page) | URL allow-list: https + `*.edu.az`/`*.gov.az`, no userinfo/port; fallback to verified default | ✅ implemented + tests |
| Reverse tabnabbing / referrer leak | `target=_blank rel="noopener noreferrer"` + `referrerpolicy=no-referrer` | ✅ |
| Fake “logged in to official system” UI | Capability registry; status endpoint returns `identityProvider.verified=false`, `officialApi.authorized=false` | ✅ + test |
| CSRF on audit endpoint | existing double-submit + Origin | ✅ + test |
| IDOR/BOLA on future official data | server-side scope via `access.ts`, official IDs never trusted from client | design |
| OIDC: code injection, CSRF login, replay | PKCE S256, `state`, `nonce`, sealed `__Host-` tx cookie, one-time use | design (Phase 2) |
| Token leakage | tokens never stored (or encrypted at rest if refresh needed), never sent to browser, redacted logs | design |
| Account takeover via linking | link only from an already authenticated local session + IdP round-trip; unique `(provider, sub)`; email/FİN never used to auto-link | design |
| SSRF | official base URLs from config allow-list only; no user-supplied URLs fetched | design |
| Session fixation | new session token on every login (existing) | ✅ |
| Brute force | per-email lockout + per-IP limit when IP known | ✅ |
| Cross-school leakage | single-tenant schema; official school ID fixed in config | ✅ by design |
| Audit tampering | append-only DB grant / hash chain (Phase 4) | design |
| Secrets exposure | env vars / secrets manager; `.env` never committed; no secrets in docs | ✅ |

## 17. Azerbaijani legal & regulatory assessment (not legal advice)

Primary source: **Law of the Republic of Azerbaijan “On Personal Data” No. 998-IIIQ of 11.05.2010** (amended 2014–2024). Official text: [afsa.gov.az PDF](https://afsa.gov.az/storage/pages/10690/ferdi-melumatlar-haqqinda-azerbaycan-respublikasinin-qanunu.pdf); also via e-qanun.az.

| Provision (summary) | Effect on our system | Type | Class |
|---|---|---|---|
| Art. 8.1–8.2 — processing generally requires written consent (incl. qualified e-signature) with purpose, data types, retention, withdrawal terms | Invitation-based accounts and any official-data display need a documented basis; consent text must list these items | Legal requirement | REQUIRES LEGAL REVIEW (whether consent or another basis applies to a state school) |
| Art. 8.3 — for minors, consent by parent/legal representative | Student data and photos: parental consent (already enforced for media via `contains_minors`/`consent_confirmed`) | Legal requirement | VERIFIED (text); scope REQUIRES LEGAL REVIEW |
| Art. 8.6 — consent collection/withdrawal centralized via E-Government Information System (with exceptions) | Our local consent checkbox may not be sufficient long-term | Legal requirement | REQUIRES LEGAL REVIEW |
| Art. 5.8, 5.9, 9.12 — technical/organizational security; operations and admin actions recorded in audit logs | Existing Argon2id, CSRF, RBAC, `audit_logs` align; formal security requirements of the competent body to be checked | Legal + practice | VERIFIED (text) |
| Art. 5.5 — staff handling personal data sign non-disclosure | School admin/editors should sign NDAs | Legal requirement | Owner action |
| Art. 9.1–9.4, 11.1 — purpose limitation, minimization, destruction when purpose ends | Retention policy needed (sessions, rate limits, logs, graduated students) — currently missing (PROJECT_MAP §11 #8) | Legal requirement | Gap |
| Art. 12 — subject requests answered within 7 working days | Need a documented request process (privacy page contact) | Legal requirement | Gap |
| Art. 14 — cross-border transfer only with adequate protection or consent | Hosting outside Azerbaijan (or foreign CDN/analytics) is a transfer; prefer hosting in Azerbaijan | Legal requirement | REQUIRES LEGAL REVIEW |
| Art. 15 — registration of personal-data information systems with the competent body | Our platform may need registration before processing official/student data at scale | Legal requirement | REQUIRES LEGAL REVIEW |
| Art. 18.3–18.4 — personal identification number used per rules of the executive body; merging databases prohibited unless allowed by law | Do not import FİN; do not merge official DB into ours without legal basis — strong argument for **display-on-demand**, not replication | Legal requirement | REQUIRES LEGAL REVIEW |
| Ratified CoE Convention 108 (Law 879-IIIQ) | Same principles (purpose, minimization, security) | Legal requirement | VERIFIED — [mincom.gov.az](https://mincom.gov.az/storage/pages/378/879-iiiq-ferdi-melumatlarin-avtomatlasdirilmis-qaydada-islenmesi-ile-elaqedar-sexslerin-qorunmasi-haqqinda-konvensiyanin-tesdiq-edilmesi-barede.pdf) |
| Government IS integration rules (Cabinet of Ministers decisions on e-government / data exchange) | Applies if we connect via national data exchange | Regulation | REQUIRES MINISTRY CONFIRMATION |

Parental consent alone is **not** assumed sufficient for official-record processing; the controller (school vs. Ministry), processor contract (Art. 9.9) and legal basis must be fixed in writing.

## 18. UI (Azerbaijani) — implemented Phase 1

- Teacher/director **dashboard card** “Rəsmi Elektron Jurnal”: buttons *Elektron Jurnal* / *Rəqəmsal məktəb* (new tab) and four separate facts: **Bu saytda** (local account) · **Rəsmi identifikasiya** (done on the official portal; this site cannot see it) · **Rəsmi portalın son açılması (bu saytdan)** · **Rəsmi məlumatlar** (not transferred, no sync).
- `/official-journal`: how it works, **İnteqrasiya vəziyyəti** list (Phase 1–4 with badges *Aktiv* / *mygov ID operatorunun təsdiqi tələb olunur* / *Nazirliyin təsdiqi tələb olunur* / *Dəstəklənmir*), troubleshooting, official support.
- Local journal renamed **“Məktəbdaxili jurnal”** with an “not the official state journal” notice.
- Forbidden wording without technical basis: “Qoşulub”, “Daxil olunub”, “Sinxronlaşdırılıb”. Integration test asserts their absence.
- Director view of future official data (teacher activity, correction approvals, sync monitor) — designed, appears only when the corresponding capability is enabled.

## 19. Testing strategy

| Layer | Now (Phase 1) | Phase 2+ (to add with the feature) |
|---|---|---|
| Unit | `official-url.test.mjs` (allow-list, look-alike domains, userinfo, port, `javascript:`) | state/nonce/issuer/audience/expiry validators; idempotency key; error translation; redaction |
| Integration | `04-official-journal.test.mjs`: role visibility, 404/403 for student/parent/editor, CSRF, audit row, last-open display, settings 422, no fabricated status, status endpoint facts, local-journal disclaimer | OIDC callback with a local fake IdP **in tests only**; link/unlink; cross-teacher access; duplicate grade; version conflict; outbox retry/dead-letter; timeout→uncertain→reconcile; rollback |
| Regression | Full existing suite (auth, isolation 7 scenarios, features) | same |
| Manual | responsive + keyboard + screen-reader pass of the card and page | official sandbox acceptance before production |

## 20. Implementation phases

| Phase | Content | Gate | State |
|---|---|---|---|
| 1 — Official redirect | card, page, verified URLs, help, audit of navigation, capability registry, status endpoint | owner approval | ✅ **Done (03.11.2026)** |
| 2 — Identity (mygov ID) | IdP adapter, link/unlink, callback, tests | IDDA registration + docs + test env | ⛔ waiting for IdP |
| 3 — Authorized read | API client, mappings, display-on-demand, sync monitor | Ministry written permission + API docs + legal basis | ⛔ waiting for Ministry |
| 4 — Authorized write | outbox, idempotency, approvals, audit hardening | explicit Ministry write permission + sandbox | ⛔ waiting for Ministry |
| 5 — Production readiness | security/privacy review, monitoring, backups, runbooks | — | partially (backup/restore, security report exist) |

## 21. Complexity & dependencies

| Phase | Effort (after access granted) | New dependencies |
|---|---|---|
| 2 | ~1–2 weeks | `jose` (JWT/JWKS) or the IdP's official SDK if mandated |
| 3 | ~3–5 weeks (mapping is the hard part) | none beyond fetch + zod |
| 4 | ~4–6 weeks incl. sandbox testing | job runner for outbox (cron/`node` worker) |

## 22. Risks & unresolved questions

1. Which official portal does school #205 use (jurnal.edu.az vs digital.edu.az)? — ask school administration.
2. Will IDDA register a school website as a relying party, and under which legal entity? — ask IDDA/SİMA (157).
3. Does the Ministry permit any third-party read access to e-journal data? — formal letter via the school.
4. Legal basis & controller/processor roles for minors' data; IS registration (Art. 15); hosting location (Art. 14).
5. Official grading rules (formula for final grades) — must come from the Ministry; our local journal does not compute official finals.
6. Risk: teachers double-entering grades (local + official). Mitigation: school decides whether the local journal is used at all for grades; the UI states it is not official.

## 23. Recommended approach

1. Keep Phase 1 in production (done).
2. Owner sends two formal requests (templates below): to the mygov ID operator (Phase 2) and to the Ministry (Phase 3/4).
3. Fix legal basics now: privacy policy update, retention policy, NDA for staff, consider IS registration.
4. Decide the role of the local journal: recommended — homework, schedule, announcements; grades optional and labelled internal.
5. Implement Phase 2/3/4 only when the corresponding documents arrive; each phase is a separate approval.

### Request template (Azerbaijani)

> **Mövzu:** 205 nömrəli məktəbin rəsmi saytının mygov ID / Elektron Jurnal ilə inteqrasiyası barədə
> Hörmətli …, Binəqədi rayonu Rövşən İmanov adına 205 nömrəli tam orta məktəbin rəsmi saytında (205maktab.az) müəllim və direktorların (1) mygov ID vasitəsilə təhlükəsiz girişi və (2) icazə verildiyi halda rəsmi elektron jurnal məlumatlarına baxışı üçün inteqrasiya imkanlarını, tələb olunan razılaşma və texniki sənədləri, sınaq mühitini bildirməyinizi xahiş edirik. Sayt şəxsi məlumatları yalnız Azərbaycan Respublikasının “Fərdi məlumatlar haqqında” Qanununa uyğun emal edir; rəsmi sistemin məlumatları köçürülmür və dəyişdirilmir.

## 24. Better officially supported alternative

The **“Müəllim” mobile app** and the Rəqəmsal məktəb platform already give teachers official journal access with mygov ID ([edu.gov.az, 10.12.2025](https://edu.gov.az/az/news-and-updates/22662-1)). The most valuable, lowest-risk step is therefore to **point teachers to the official app/portal** (done) and use our platform for what the official system does not cover: school news, media with consent workflow, homework, announcements and parent communication. Data integration should be pursued only through the formal channels above.

---

### Sources (accessed 03.11.2026)
- Ministry of Science and Education — Rəqəmsal məktəb: https://edu.gov.az/az/news-and-updates/21873-1 (updated 28.01.2026)
- Ministry — “Müəllim” mobile app: https://edu.gov.az/az/news-and-updates/22662-1 (10.12.2025)
- IDDA — digital.login → mygov ID: https://idda.az/en/news/digitallogin-will-continue-its-operations-under-the-new-name-mygov-id (28.10.2025)
- Ministry of Digital Development and Transport — same announcement: https://mincom.gov.az/en/media-en/news/digitallogin-to-continue-as-mygov-id
- SİMA — new generation digital signature: https://mincom.gov.az/en/projects/sima-new-generation-digital-signature
- National Data Exchange (Digital Bridge): https://xeberler.az/new/details/milli-melumat-mubadilesine-70-qurumun-100-den-cox-informasiya-sistemi-inteqrasiya-edilib--32398.htm (17.09.2024; secondary source)
- Law No. 998-IIIQ “On Personal Data”: https://afsa.gov.az/storage/pages/10690/ferdi-melumatlar-haqqinda-azerbaycan-respublikasinin-qanunu.pdf
- Law No. 879-IIIQ (Convention 108 ratification): https://mincom.gov.az/storage/pages/378/879-iiiq-ferdi-melumatlarin-avtomatlasdirilmis-qaydada-islenmesi-ile-elaqedar-sexslerin-qorunmasi-haqqinda-konvensiyanin-tesdiq-edilmesi-barede.pdf
- Direct inspection (read-only, built-in browser): jurnal.edu.az/login, digital.edu.az teacher/director entries, mygovid.gov.az/auth
