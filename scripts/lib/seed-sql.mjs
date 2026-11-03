// Rollar/icazələr (src/config/rbac.json) və standart zəng cədvəli üçün idempotent SQL.
// Həm `npm run db:migrate`, həm də supabase/seed.sql və supabase/setup.sql eyni mətni istifadə edir.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const lit = (v) => (v === null || v === undefined ? "NULL" : `'${String(v).replace(/'/g, "''")}'`);

export function readRbac(root) {
  return JSON.parse(fs.readFileSync(path.join(root, "src", "config", "rbac.json"), "utf8"));
}

export function seedSql(root) {
  const rbac = readRbac(root);
  const allCodes = rbac.permissions.map((p) => p.code);
  const pairs = [];
  for (const [role, perms] of Object.entries(rbac.rolePermissions)) {
    for (const code of perms.includes("*") ? allCodes : perms) pairs.push(`(${lit(role)}, ${lit(code)})`);
  }
  const mappedRoles = Object.keys(rbac.rolePermissions).map(lit).join(", ");
  const s1 = [["08:00", "08:45"], ["08:50", "09:35"], ["09:45", "10:30"], ["10:40", "11:25"], ["11:35", "12:20"], ["12:25", "13:10"]];
  const s2 = [["13:30", "14:15"], ["14:20", "15:05"], ["15:15", "16:00"], ["16:10", "16:55"], ["17:05", "17:50"], ["17:55", "18:40"]];
  const bells = [...s1.map((t, i) => [1, i + 1, ...t]), ...s2.map((t, i) => [2, i + 1, ...t])]
    .map(([sh, p, a, b]) => `(${sh}, ${p}, time ${lit(a)}, time ${lit(b)})`)
    .join(",\n  ");

  return `-- Rollar və icazələr: src/config/rbac.json-dan avtomatik yaradılıb (scripts/lib/seed-sql.mjs). Əl ilə redaktə etməyin.
INSERT INTO public.roles (code, name_az, description_az) VALUES
  ${rbac.roles.map((r) => `(${lit(r.code)}, ${lit(r.name)}, ${lit(r.description)})`).join(",\n  ")}
ON CONFLICT (code) DO UPDATE SET name_az = EXCLUDED.name_az, description_az = EXCLUDED.description_az;

INSERT INTO public.permissions (code, name_az, module) VALUES
  ${rbac.permissions.map((p) => `(${lit(p.code)}, ${lit(p.name)}, ${lit(p.module)})`).join(",\n  ")}
ON CONFLICT (code) DO UPDATE SET name_az = EXCLUDED.name_az, module = EXCLUDED.module;

DELETE FROM public.role_permissions WHERE role_id IN (SELECT id FROM public.roles WHERE code IN (${mappedRoles}));

INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
  FROM (VALUES
  ${pairs.join(",\n  ")}
  ) AS m(role_code, permission_code)
  JOIN public.roles r ON r.code = m.role_code
  JOIN public.permissions p ON p.code = m.permission_code
ON CONFLICT DO NOTHING;

-- Standart zəng cədvəli (yalnız cədvəl boşdursa; admin paneldən dəyişdirilə bilər)
INSERT INTO public.bell_times (shift, period, start_time, end_time)
SELECT v.shift, v.period, v.start_time, v.end_time
  FROM (VALUES
  ${bells}
  ) AS v(shift, period, start_time, end_time)
 WHERE NOT EXISTS (SELECT 1 FROM public.bell_times);
`;
}

export function migrationFiles(root) {
  const dir = path.join(root, "supabase", "migrations");
  return fs
    .readdirSync(dir)
    .filter((f) => /^\d{4}_.+\.sql$/.test(f))
    .sort()
    .map((name) => {
      const sql = fs.readFileSync(path.join(dir, name), "utf8").replace(/\r\n/g, "\n");
      return { name, sql, checksum: crypto.createHash("sha256").update(sql).digest("hex") };
    });
}

export const MIGRATIONS_TABLE_SQL = `CREATE TABLE IF NOT EXISTS public.schema_migrations (
  name         varchar(255) PRIMARY KEY,
  checksum     char(64)     NOT NULL,
  executed_at  timestamptz  NOT NULL DEFAULT now()
);
ALTER TABLE public.schema_migrations ENABLE ROW LEVEL SECURITY;`;
