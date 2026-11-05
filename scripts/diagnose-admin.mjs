// Admin "əlavə et" problemi üçün YALNIZ OXUYAN diaqnostika (heç nə yazmır: READ ONLY tranzaksiya).
// Parol, hash, token və .env dəyərləri göstərilmir.
// İstifadə: npm run diagnose:admin            (və ya: npm run diagnose:admin -- admin@example.com sagird@example.com)
import { loadEnv, connect, ROOT } from "./lib/env.mjs";
import { migrationFiles, readRbac } from "./lib/seed-sql.mjs";

loadEnv();
const emails = process.argv.slice(2).filter((a) => a.includes("@")).map((e) => e.trim().toLowerCase());
const conn = await connect();
const out = [];
const log = (s = "") => out.push(s);
const q = async (sql, params) => (await conn.query(sql, params))[0];

try {
  await conn.exec("BEGIN READ ONLY");

  log("== Miqrasiyalar ==");
  const applied = new Map((await q("SELECT name, checksum FROM schema_migrations ORDER BY name")).map((r) => [r.name, r.checksum]));
  for (const m of migrationFiles(ROOT)) {
    const st = !applied.has(m.name) ? "✗ İCRA EDİLMƏYİB" : applied.get(m.name) !== m.checksum ? "⚠ fayl dəyişib" : "✓";
    log(`  ${st.padEnd(18)} ${m.name}`);
  }

  log("\n== Kod tərəfindən gözlənilən sxem ==");
  const col = async (t, c) => (await q("SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name=? AND column_name=?", [t, c])).length > 0;
  const tbl = async (t) => (await q("SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name=?", [t])).length > 0;
  log(`  class_invite_codes cədvəli: ${(await tbl("class_invite_codes")) ? "✓" : "✗ YOXDUR"}`);
  log(`  classes.is_active sütunu:   ${(await col("classes", "is_active")) ? "✓" : "✗ YOXDUR"}`);

  log("\n== İcazələr (rbac.json ↔ baza) ==");
  const rbac = readRbac(ROOT);
  const dbPerms = new Set((await q("SELECT code FROM permissions")).map((r) => r.code));
  const missing = rbac.permissions.map((p) => p.code).filter((c) => !dbPerms.has(c));
  log(`  Bazada olmayan icazələr: ${missing.length ? missing.join(", ") : "yoxdur ✓"}`);
  for (const role of ["super_admin", "school_admin", "director"]) {
    const want = rbac.rolePermissions[role]?.includes("*") ? rbac.permissions.length : (rbac.rolePermissions[role] || []).length;
    const [r] = await q("SELECT COUNT(*) AS n FROM role_permissions rp JOIN roles r ON r.id = rp.role_id WHERE r.code = ?", [role]);
    log(`  ${role.padEnd(14)} bazada ${r.n} / gözlənilən ${want}${r.n < want ? "  ⚠ çatışmır" : ""}`);
  }

  log("\n== Test hesabları ==");
  for (const email of emails) {
    const [u] = await q("SELECT id, role, is_active, email_verified, deleted_at FROM users WHERE email = ?", [email]);
    if (!u) { log(`  ${email}: ✗ hesab yoxdur`); continue; }
    const roles = (await q("SELECT r.code FROM user_roles ur JOIN roles r ON r.id = ur.role_id WHERE ur.user_id = ?", [u.id])).map((r) => r.code);
    const perms = new Set((await q(`SELECT DISTINCT p.code FROM user_roles ur JOIN role_permissions rp ON rp.role_id = ur.role_id
                                     JOIN permissions p ON p.id = rp.permission_id WHERE ur.user_id = ?`, [u.id])).map((r) => r.code));
    const key = ["admin.access", "school.manage", "teachers.manage", "students.manage", "classes.manage", "content.manage", "events.manage"];
    log(`  ${email}: #${u.id} users.role=${u.role} rollar=[${roles.join(", ") || "YOXDUR"}] aktiv=${u.is_active} təsdiq=${u.email_verified}${u.deleted_at ? " SİLİNİB" : ""}`);
    log(`    icazələr: ${key.map((k) => `${k}${perms.has(k) ? "✓" : "✗"}`).join("  ")}`);
    const [stu] = await q("SELECT s.id, s.class_id, c.name AS class_name FROM students s LEFT JOIN classes c ON c.id = s.class_id WHERE s.user_id = ?", [u.id]);
    if (stu) log(`    şagird profili #${stu.id}, sinif: ${stu.class_name ?? "təyin edilməyib"}`);
  }

  log("\n== ID ardıcıllıqları (identity) — növbəti dəyər mövcud MAX(id)-dən kiçikdirsə INSERT 'artıq mövcuddur' xətası verir ==");
  const ids = await q(`SELECT c.table_name AS t, pg_get_serial_sequence('public.' || quote_ident(c.table_name), 'id') AS seq
                         FROM information_schema.columns c
                        WHERE c.table_schema = 'public' AND c.column_name = 'id' AND c.is_identity = 'YES' ORDER BY c.table_name`);
  let bad = 0;
  for (const { t, seq } of ids) {
    if (!seq) continue;
    const [m] = await q(`SELECT COALESCE(MAX(id), 0) AS mx FROM public."${t.replace(/"/g, '""')}"`);
    const [s] = await q(`SELECT last_value, is_called FROM ${seq}`);
    const next = s.is_called ? Number(s.last_value) + 1 : Number(s.last_value);
    if (next <= Number(m.mx)) { bad++; log(`  ✗ ${t}: növbəti id ${next}, amma MAX(id) = ${m.mx}`); }
  }
  log(bad ? `  ${bad} cədvəldə ardıcıllıq geridə qalıb.` : "  ✓ bütün ardıcıllıqlar qaydasındadır");

  log("\n== RLS ==");
  const forced = await q("SELECT relname FROM pg_class WHERE relnamespace = 'public'::regnamespace AND relkind='r' AND relforcerowsecurity");
  log(`  FORCE RLS olan cədvəllər: ${forced.length ? forced.map((r) => r.relname).join(", ") + "  ⚠" : "yoxdur ✓"}`);
  const [who] = await q("SELECT current_user AS u, (SELECT rolbypassrls FROM pg_roles WHERE rolname = current_user) AS bypass");
  const notOwned = await q(`SELECT tablename FROM pg_tables WHERE schemaname='public' AND tableowner <> current_user`);
  log(`  bağlantı rolu: ${who.u}, bypassrls=${who.bypass}; bu rola məxsus olmayan cədvəllər: ${notOwned.length ? notOwned.map((r) => r.tablename).join(", ") + "  ⚠" : "yoxdur ✓"}`);
  const policies = await q("SELECT tablename, COUNT(*) AS n FROM pg_policies WHERE schemaname='public' GROUP BY tablename");
  log(`  RLS siyasətləri: ${policies.length ? policies.map((p) => `${p.tablename}(${p.n})`).join(", ") : "yoxdur (gözlənilən)"}`);

  log("\n== Fayl yükləmə (Supabase Storage) ==");
  const hasStorage = (await q("SELECT 1 FROM information_schema.schemata WHERE schema_name = 'storage'")).length > 0;
  if (!hasStorage) log("  storage sxemi yoxdur (lokal baza)");
  else {
    const want = process.env.SUPABASE_STORAGE_BUCKET || "school-files";
    const buckets = await q("SELECT id, public FROM storage.buckets ORDER BY id");
    log(`  bucket-lər: ${buckets.map((b) => `${b.id}${b.public ? " (public!)" : ""}`).join(", ") || "YOXDUR"}`);
    log(`  "${want}" bucket-i: ${buckets.some((b) => b.id === want) ? "✓" : "✗ YOXDUR — şəkil/PDF yükləmə və onlara bağlı qeydlər alınmaz"}`);
  }
  log(`  .env-də SUPABASE_SECRET_KEY: ${process.env.SUPABASE_SECRET_KEY ? "təyin edilib" : "✗ yoxdur"} (dəyər göstərilmir)`);

  log("\n== Əsas məlumat ==");
  for (const t of ["school_years", "classes", "subjects", "teachers", "students", "class_invite_codes"]) {
    if (!(await tbl(t))) continue;
    const [r] = await q(`SELECT COUNT(*) AS n FROM public."${t}"`);
    log(`  ${t.padEnd(20)} ${r.n}`);
  }
  const [yr] = await q("SELECT name FROM school_years WHERE is_active = 1 LIMIT 1");
  log(`  aktiv tədris ili: ${yr?.name ?? "✗ YOXDUR (sinif/cədvəl əlavə etmək mümkün olmayacaq)"}`);

  log("\n== Son admin yaratma əməliyyatları (audit) ==");
  const last = await q("SELECT action, created_at FROM audit_logs WHERE action LIKE '%.create' ORDER BY id DESC LIMIT 10");
  for (const r of last) log(`  ${r.created_at}  ${r.action}`);
  if (!last.length) log("  (heç bir yaratma qeydi yoxdur)");
} catch (e) {
  log(`\n✗ Diaqnostika xətası: ${e.code ?? ""} ${e.message}`);
} finally {
  try { await conn.exec("ROLLBACK"); } catch { /* */ }
  await conn.end();
  console.log(out.join("\n"));
}
