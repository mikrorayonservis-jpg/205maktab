// Development üçün demo məktəb. Production-da işləmir. Parol DEV_SEED_PASSWORD mühit dəyişənindən götürülür.
// İstifadə (PowerShell): $env:DEV_SEED_PASSWORD="Demo-Parol-2026"; npm run seed:dev
import { loadEnv, connect } from "./lib/env.mjs";
import { createDemoSchool, currentSchoolYear } from "./lib/demo-data.mjs";

loadEnv();
if (process.env.NODE_ENV === "production") {
  console.error("[seed:dev] Production mühitində demo məlumat yaradılmır.");
  process.exit(1);
}
const pw = process.env.DEV_SEED_PASSWORD;
if (!pw || pw.length < 10) {
  console.error("[seed:dev] DEV_SEED_PASSWORD (ən azı 10 simvol) təyin edin. Parol kodda saxlanılmır.");
  process.exit(1);
}
const c = await connect();
// Əvvəlki uğursuz cəhd bütün tədris illərini deaktiv etmiş ola bilər — aktiv il yoxdursa, cari ili bərpa edirik.
{
  const [[active]] = await c.query("SELECT id FROM school_years WHERE is_active = 1 LIMIT 1");
  if (!active) {
    const [r] = await c.query("UPDATE school_years SET is_active = 1 WHERE name = ?", [currentSchoolYear().name]);
    if (r.affectedRows) console.log(`[seed:dev] ${currentSchoolYear().name} tədris ili yenidən aktiv edildi.`);
  }
}
const [[exists]] = await c.query("SELECT id FROM users WHERE email = 'admin@demo.local'");
if (exists) {
  console.log("[seed:dev] Demo məlumatlar artıq mövcuddur.");
} else {
  // Hamısı bir tranzaksiyada: xəta olarsa, bazada yarımçıq demo məlumat qalmır.
  // Demo siniflər real siniflərlə qarışmasın deyə "(demo)" şəkilçisi ilə yaradılır.
  await c.beginTransaction();
  try {
    await createDemoSchool(c, pw, { classSuffix: " (demo)" });
    await c.commit();
  } catch (e) {
    await c.rollback();
    await c.end();
    console.error("[seed:dev] Xəta — heç bir dəyişiklik saxlanmadı:", e.sqlMessage || e.message);
    process.exit(1);
  }
  console.log("[seed:dev] Demo məktəb yaradıldı. Hesablar: admin@demo.local, direktor@demo.local, muellim1..3@demo.local, sagird1..3@demo.local, valideyn1..2@demo.local, redaktor@demo.local, bas.redaktor@demo.local, muellif@demo.local");
}
await c.end();
