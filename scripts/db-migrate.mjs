// Miqrasiya icraçısı: supabase/migrations/*.sql fayllarını ardıcıl, hər birini ayrıca tranzaksiyada icra edir,
// sonra rolları/icazələri src/config/rbac.json-dan sinxronlaşdırır.
// İstifadə: npm run db:migrate   |   test bazası üçün: npm run db:migrate -- --test
//
// Təhlükəsizlik: heç bir DROP/TRUNCATE icra edilmir. İcra edilmiş fayl dəyişdirilibsə icraçı dayanır —
// dəyişiklik üçün yeni nömrəli miqrasiya faylı yaradılmalıdır.
import { loadEnv, connect, isTestFlag, ROOT } from "./lib/env.mjs";
import { MIGRATIONS_TABLE_SQL, migrationFiles, seedSql } from "./lib/seed-sql.mjs";

loadEnv();
const test = isTestFlag();

async function run() {
  const conn = await connect({ test });
  try {
    await conn.exec(MIGRATIONS_TABLE_SQL);
    const [doneRows] = await conn.query("SELECT name, checksum FROM schema_migrations");
    const done = new Map(doneRows.map((r) => [r.name, r.checksum]));

    for (const m of migrationFiles(ROOT)) {
      if (done.has(m.name)) {
        if (done.get(m.name) !== m.checksum) {
          throw new Error(`${m.name} icra edildikdən sonra dəyişdirilib. Köhnə faylı bərpa edin və dəyişikliyi yeni miqrasiya faylında yazın.`);
        }
        continue;
      }
      process.stdout.write(`[migrate] ${m.name} ... `);
      await conn.exec("BEGIN");
      try {
        await conn.exec(m.sql);
        await conn.query("INSERT INTO schema_migrations (name, checksum) VALUES (?, ?)", [m.name, m.checksum]);
        await conn.exec("COMMIT");
      } catch (e) {
        await conn.exec("ROLLBACK");
        e.message = `${m.name}: ${e.message}`;
        throw e;
      }
      console.log("OK");
    }

    await conn.exec(`BEGIN;\n${seedSql(ROOT)}\nCOMMIT;`);

    // Qoruma: RLS-siz cədvəl qalmamalıdır (Data API-dən gizli saxlanılır; server sahibi rol kimi RLS-dən təsirlənmir)
    const [noRls] = await conn.query("SELECT tablename FROM pg_catalog.pg_tables WHERE schemaname = 'public' AND NOT rowsecurity");
    for (const { tablename } of noRls) {
      await conn.exec(`ALTER TABLE public."${tablename.replace(/"/g, '""')}" ENABLE ROW LEVEL SECURITY`);
      console.warn(`[migrate] XƏBƏRDARLIQ: ${tablename} cədvəlində RLS aktiv deyildi — aktivləşdirildi. Miqrasiyaya əlavə edin.`);
    }
    console.log(`[migrate] Hazırdır${test ? " (test bazası)" : ""}. Rollar, icazələr və zəng cədvəli sinxronlaşdırıldı.`);
  } finally {
    await conn.end();
  }
}

run().catch((err) => {
  console.error("\n[migrate] Xəta:", err.message);
  process.exit(1);
});
