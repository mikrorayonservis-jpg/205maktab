// Miqrasiya icraçısı: database/migrations/*.sql fayllarını ardıcıl icra edir və RBAC-ı sinxronlaşdırır.
// İstifadə: npm run db:migrate   |   test bazası üçün: npm run db:migrate -- --test
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { loadEnv, connect, ensureDatabase, isTestFlag, ROOT } from "./lib/env.mjs";

loadEnv();
const test = isTestFlag();
const dir = path.join(ROOT, "database", "migrations");

async function syncRbac(conn) {
  const rbac = JSON.parse(fs.readFileSync(path.join(ROOT, "src", "config", "rbac.json"), "utf8"));
  await conn.beginTransaction();
  try {
    for (const r of rbac.roles) {
      await conn.query(
        `INSERT INTO roles (code, name_az, description_az) VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE name_az = VALUES(name_az), description_az = VALUES(description_az)`,
        [r.code, r.name, r.description]
      );
    }
    for (const p of rbac.permissions) {
      await conn.query(
        `INSERT INTO permissions (code, name_az, module) VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE name_az = VALUES(name_az), module = VALUES(module)`,
        [p.code, p.name, p.module]
      );
    }
    const allCodes = rbac.permissions.map((p) => p.code);
    for (const [role, perms] of Object.entries(rbac.rolePermissions)) {
      const [[roleRow]] = await conn.query("SELECT id FROM roles WHERE code = ?", [role]);
      if (!roleRow) continue;
      await conn.query("DELETE FROM role_permissions WHERE role_id = ?", [roleRow.id]);
      const codes = perms.includes("*") ? allCodes : perms;
      if (codes.length) {
        await conn.query(
          `INSERT INTO role_permissions (role_id, permission_id)
           SELECT ?, id FROM permissions WHERE code IN (?)`,
          [roleRow.id, codes]
        );
      }
    }
    await conn.commit();
  } catch (e) {
    await conn.rollback();
    throw e;
  }
}

async function seedDefaults(conn) {
  const [[{ n }]] = await conn.query("SELECT COUNT(*) AS n FROM bell_times");
  if (Number(n) === 0) {
    const s1 = [["08:00","08:45"],["08:50","09:35"],["09:45","10:30"],["10:40","11:25"],["11:35","12:20"],["12:25","13:10"]];
    const s2 = [["13:30","14:15"],["14:20","15:05"],["15:15","16:00"],["16:10","16:55"],["17:05","17:50"],["17:55","18:40"]];
    const rows = [...s1.map((t, i) => [1, i + 1, t[0], t[1]]), ...s2.map((t, i) => [2, i + 1, t[0], t[1]])];
    await conn.query("INSERT INTO bell_times (shift, period, start_time, end_time) VALUES ?", [rows]);
    console.log("[migrate] Standart zəng cədvəli əlavə edildi (admin paneldən dəyişdirilə bilər).");
  }
}

/** SQL faylını ayrı ifadələrə bölür (əvvəlcə şərh sətirləri silinir). */
function splitSql(sql) {
  return sql
    .split(/\r?\n/)
    .filter((l) => !l.trim().startsWith("--"))
    .join("\n")
    .split(/;\s*(?:\n|$)/)
    .map((s) => s.trim())
    .filter(Boolean);
}

// "Artıq mövcuddur" xətaları: əvvəlki yarımçıq icradan qalmış ifadələr təkrar icra edildikdə ötürülür.
const ALREADY_APPLIED = new Set([1050, 1060, 1061, 1826, 1091, 1022]);

async function execFile(conn, file, sql) {
  let skipped = 0;
  for (const stmt of splitSql(sql)) {
    try {
      await conn.query(stmt);
    } catch (e) {
      if (ALREADY_APPLIED.has(e.errno)) {
        skipped++;
        continue;
      }
      e.message = `${file}: ${e.sqlMessage || e.message}\n--- ifadə ---\n${stmt.slice(0, 300)}`;
      throw e;
    }
  }
  return skipped;
}

async function run() {
  if (test) await ensureDatabase({ test: true });
  const conn = await connect({ test });
  await conn.query(`CREATE TABLE IF NOT EXISTS migrations (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT,
      name VARCHAR(255) NOT NULL,
      executed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uq_migrations_name (name)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
  const [cols] = await conn.query("SHOW COLUMNS FROM migrations LIKE 'checksum'");
  if (cols.length === 0) await conn.query("ALTER TABLE migrations ADD COLUMN checksum CHAR(64) NULL");

  const [doneRows] = await conn.query("SELECT name, checksum FROM migrations");
  const done = new Map(doneRows.map((r) => [r.name, r.checksum]));
  const files = fs.readdirSync(dir).filter((f) => /^\d{3}_.+\.sql$/.test(f)).sort();

  // Baza sxemi (001–008) idempotentdir (CREATE ... IF NOT EXISTS). v1 icraçısı şərhlə başlayan
  // ifadələri ötürdüyü üçün bəzi cədvəllər yaradılmamış ola bilər — hər dəfə yoxlanılır və tamamlanır.
  for (const file of files.filter((f) => /^00[1-8]_/.test(f))) {
    await execFile(conn, file, fs.readFileSync(path.join(dir, file), "utf8"));
  }

  for (const file of files) {
    const sql = fs.readFileSync(path.join(dir, file), "utf8");
    const sum = crypto.createHash("sha256").update(sql).digest("hex");
    if (done.has(file)) {
      const prev = done.get(file);
      if (prev && prev !== sum && !/^00[1-8]_/.test(file)) console.warn(`[migrate] XƏBƏRDARLIQ: ${file} icra edildikdən sonra dəyişdirilib. Yeni miqrasiya faylı yaradın.`);
      if (!prev) await conn.query("UPDATE migrations SET checksum = ? WHERE name = ?", [sum, file]);
      continue;
    }
    process.stdout.write(`[migrate] ${file} ... `);
    const skipped = await execFile(conn, file, sql);
    await conn.query("INSERT INTO migrations (name, checksum) VALUES (?, ?)", [file, sum]);
    console.log(skipped ? `OK (${skipped} ifadə artıq tətbiq edilmişdi)` : "OK");
  }

  await syncRbac(conn);
  await seedDefaults(conn);
  console.log(`[migrate] Hazırdır${test ? " (test bazası)" : ""}. Rollar və icazələr sinxronlaşdırıldı.`);
  await conn.end();
}

run().catch((err) => {
  console.error("\n[migrate] Xəta:", err.message || err.sqlMessage);
  process.exit(1);
});
