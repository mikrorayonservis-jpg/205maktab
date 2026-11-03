// Mövcud MySQL bazasındakı məlumatları Supabase Postgres-ə köçürür (bir dəfəlik).
//
//  - Mənbə (MySQL) yalnız OXUNUR: MYSQL_HOST, MYSQL_PORT, MYSQL_USER, MYSQL_PASSWORD, MYSQL_DATABASE
//    (təyin edilməyibsə köhnə DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME dəyişənləri istifadə olunur).
//  - Hədəf (DATABASE_URL) əvvəlcə `npm run db:migrate` ilə hazırlanmalıdır və tətbiq cədvəlləri BOŞ olmalıdır —
//    skript mövcud məlumatın üzərinə yazmır, doluysa dayanır.
//  - Defolt rejim yoxlamadır (heç nə yazılmır). Köçürmək üçün: npm run db:copy-mysql -- --apply
//  - Hamısı bir tranzaksiyadır: hər hansı xəta olarsa Postgres-də heç nə dəyişmir.
//  - ID-lər saxlanılır (URL-lər və əlaqələr dəyişmir); rol ID-ləri kod üzrə uyğunlaşdırılır.
//  - Köçürülmür: sessions (hamı yenidən daxil olur), rate_limits, roles/permissions/role_permissions (rbac.json-dan).
//  - Fayllar (storage/) ayrıca köçürülür: npm run storage:upload
import mysql from "mysql2/promise";
import { loadEnv, connect } from "./lib/env.mjs";

loadEnv();
const apply = process.argv.includes("--apply");

// FK asılılıqlarına görə sıra
const TABLES = [
  "users", "school_years", "subjects", "teachers", "classes", "students", "parents", "parent_student",
  "class_subjects", "class_students", "bell_times", "invitations", "user_roles", "email_verifications",
  "password_resets", "login_attempts", "lessons", "grades", "attendance", "files", "homework", "homework_files",
  "homework_submissions", "news_categories", "news_authors", "galleries", "news", "news_revisions", "events",
  "gallery_images", "gallery_videos", "documents", "leadership", "achievements", "useful_links", "pages",
  "notifications", "audit_logs", "site_settings",
];
const LOWERCASE_EMAIL = new Set(["users", "parents", "invitations"]);

function sourceConfig() {
  const e = (a, b) => process.env[a] || process.env[b];
  const cfg = { host: e("MYSQL_HOST", "DB_HOST"), port: Number(e("MYSQL_PORT", "DB_PORT") || 3306), user: e("MYSQL_USER", "DB_USER"), password: e("MYSQL_PASSWORD", "DB_PASSWORD"), database: e("MYSQL_DATABASE", "DB_NAME") };
  for (const [k, v] of Object.entries(cfg)) if (v === undefined || v === "") throw new Error(`MySQL mənbəsi üçün ${k} təyin edilməyib (MYSQL_* və ya DB_* dəyişənləri).`);
  return cfg;
}

function convert(value, pgType, table, column) {
  if (value === null || value === undefined) return null;
  if (typeof value === "string" && /^0000-00-00/.test(value)) return null;
  if (pgType === "timestamp with time zone") return `${String(value).replace("T", " ").slice(0, 19)}+04:00`; // MySQL sessiyası +04:00 idi
  if (pgType === "jsonb" || pgType === "json") return typeof value === "string" ? value : JSON.stringify(value);
  if (pgType === "smallint" && typeof value === "boolean") return value ? 1 : 0;
  if (LOWERCASE_EMAIL.has(table) && column === "email" && typeof value === "string") return value.trim().toLowerCase();
  if (Buffer.isBuffer(value)) return value.toString("utf8");
  return value;
}

async function run() {
  const src = await mysql.createConnection({ ...sourceConfig(), charset: "utf8mb4", timezone: "+04:00", dateStrings: true, supportBigNumbers: true, bigNumberStrings: false });
  await src.query("SET time_zone = '+04:00'");
  const dst = await connect();
  try {
    const [[{ n: migrated }]] = await dst.query("SELECT COUNT(*) AS n FROM schema_migrations");
    if (!migrated) throw new Error("Hədəf baza hazır deyil. Əvvəlcə: npm run db:migrate");

    const [srcTables] = await src.query("SELECT table_name AS t FROM information_schema.tables WHERE table_schema = DATABASE() AND table_type = 'BASE TABLE'");
    const srcSet = new Set(srcTables.map((r) => r.t ?? r.TABLE_NAME));

    // Hədəf boş olmalıdır (bell_times istisna: standart zəng cədvəli mənbədən gələnlə əvəz olunur)
    const nonEmpty = [];
    for (const t of TABLES) {
      if (t === "bell_times") continue;
      const [[{ n }]] = await dst.query(`SELECT COUNT(*) AS n FROM public."${t}"`);
      if (n > 0) nonEmpty.push(`${t} (${n})`);
    }
    if (nonEmpty.length) throw new Error(`Hədəf bazada artıq məlumat var: ${nonEmpty.join(", ")}. Üzərinə yazılmır.`);

    const [srcRoles] = await src.query("SELECT id, code FROM roles");
    const [dstRoles] = await dst.query("SELECT id, code FROM roles");
    const roleByCode = new Map(dstRoles.map((r) => [r.code, r.id]));
    const roleMap = new Map(srcRoles.map((r) => [r.id, roleByCode.get(r.code)]));

    const plan = [];
    for (const t of TABLES) {
      if (!srcSet.has(t)) {
        plan.push({ t, rows: [], note: "mənbədə yoxdur" });
        continue;
      }
      const [cols] = await dst.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_schema = 'public' AND table_name = ?", [t]);
      const types = new Map(cols.map((c) => [c.column_name, c.data_type]));
      const [rows] = await src.query(`SELECT * FROM \`${t}\``);
      const srcCols = rows.length ? Object.keys(rows[0]) : [];
      const common = srcCols.filter((c) => types.has(c));
      const dropped = srcCols.filter((c) => !types.has(c));
      let data = rows;
      if (t === "user_roles") {
        data = rows.filter((r) => roleMap.get(r.role_id)).map((r) => ({ ...r, role_id: roleMap.get(r.role_id) }));
      }
      plan.push({ t, rows: data, common, types, note: dropped.length ? `köçürülməyən sütunlar: ${dropped.join(", ")}` : "" });
    }

    console.log(`Mənbə: MySQL ${sourceConfig().database}  →  Hədəf: Postgres ${new URL(process.env.DATABASE_URL).hostname}\n`);
    for (const p of plan) console.log(`  ${p.t.padEnd(22)} ${String(p.rows.length).padStart(6)} sətir  ${p.note}`);
    if (!apply) {
      console.log("\nYoxlama rejimi — heç nə yazılmadı. Köçürmək üçün: npm run db:copy-mysql -- --apply");
      return;
    }

    await dst.exec("BEGIN");
    try {
      const srcBells = plan.find((p) => p.t === "bell_times");
      if (srcBells?.rows.length) await dst.exec("DELETE FROM public.bell_times"); // yalnız standart dəyərlər idi (yuxarıda yoxlanılıb)
      for (const p of plan) {
        if (!p.rows.length) continue;
        const colSql = p.common.map((c) => `"${c}"`).join(", ");
        for (let i = 0; i < p.rows.length; i += 500) {
          const batch = p.rows.slice(i, i + 500).map((r) => p.common.map((c) => convert(r[c], p.types.get(c), p.t, c)));
          await dst.query(`INSERT INTO public."${p.t}" (${colSql}) VALUES ? RETURNING 1`, [batch]);
        }
        if (p.types.has("id") && !["parent_student", "user_roles", "role_permissions", "homework_files"].includes(p.t)) {
          await dst.exec(`SELECT setval(pg_get_serial_sequence('public."${p.t}"', 'id'), COALESCE((SELECT MAX(id) FROM public."${p.t}"), 0) + 1, false)`);
        }
      }
      await dst.exec("COMMIT");
    } catch (e) {
      await dst.exec("ROLLBACK");
      throw e;
    }
    console.log("\n✓ Köçürmə tamamlandı. Növbəti addım: npm run storage:upload (yüklənmiş fayllar).");
  } finally {
    await src.end();
    await dst.end();
  }
}

run().catch((e) => {
  console.error("[copy-mysql] Xəta — heç nə dəyişdirilmədi:", e.message);
  process.exit(1);
});
