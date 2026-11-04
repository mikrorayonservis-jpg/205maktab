# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Primary (confirmed): **parents and students** of 205 nömrəli tam orta məktəb (Binəqədi, Baku). They mostly use a phone to check grades, attendance, the timetable, homework, notifications and school news. Mobile is the priority surface for them.

Other audiences (from the repository): teachers (daily journal, grades, attendance, homework), school administration and director (users, invitations, schedule, content, reports), the newsroom (author, editor, chief editor) and public visitors (prospective parents, education authorities, media).

## Product Purpose

One platform for the school with three systems on one domain and one account system:
1. the official school website (about, leadership, teachers, documents, contact);
2. an educational news portal with an editorial workflow, events and a gallery;
3. an electronic student journal (grades, attendance, timetable, homework, notifications, role dashboards).

Success: a parent finds their child's current situation in seconds on a phone, and a teacher records a lesson without friction.

## Positioning

The school's own platform. Its news is written by the school's own newsroom (the school newspaper "Yeni Dövr 205"), and its journal data is scoped to the people allowed to see it. The official state journal is linked to only and never imitated (navigation only, "Path B").

## Operating Context

- Azerbaijani UI only. Dates are DD.MM.YYYY in 24h time, Asia/Baku time zone.
- Two shifts, a 5-day week, invitation-code registration.
- Next.js 15 + Supabase Postgres, deployed on Vercel. Access control is enforced on the server (`src/server/access.ts`, `route()`).

## Capabilities and Constraints

- Student privacy is critical: there are no public student profiles. Photos and articles about minors are published only with `consent_confirmed`.
- Roles and permissions live only in `src/config/rbac.json`.
- Public and dashboard light/dark themes are independent (`src/components/ThemeScope.tsx`).
- Undecided: whether the current colour palette and the fonts (Manrope/Inter) are binding. The user did not mark them as fixed.

## Brand Commitments

- The school logo (`public/assets/logo/*`) stays as it is.
- Only real school photographs are used, never stock or AI-generated images (sources: repository root photos, `qezet-205-mekteb.html`/`.pdf`).

## Evidence on Hand

- Real photos and the newspaper archive in the repository root, plus content imported into the database.
- Do not invent statistics, achievements, testimonials or official claims.

## Product Principles

1. Privacy before visibility: when in doubt, do not show it publicly.
2. Phone first for parents and students. Desktop efficiency for teachers and admins.
3. Official and calm: credibility over spectacle.
4. One source of truth for every rule (permissions, resources, themes).

## Accessibility & Inclusion

WCAG 2.2 AA (confirmed): contrast, full keyboard operation, visible focus, labelled controls, a reduced-motion fallback and touch targets of at least 24px (44px preferred).
