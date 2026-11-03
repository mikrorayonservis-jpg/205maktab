// supabase/seed.sql və supabase/setup.sql fayllarını miqrasiyalardan və rbac.json-dan yenidən yaradır.
// setup.sql: Supabase SQL Editor-də bir dəfə icra etmək üçün — bütün miqrasiyalar + seed, bir tranzaksiyada.
// İstifadə: npm run supabase:bundle
import fs from "node:fs";
import path from "node:path";
import { ROOT } from "./lib/env.mjs";
import { MIGRATIONS_TABLE_SQL, migrationFiles, seedSql } from "./lib/seed-sql.mjs";

const out = path.join(ROOT, "supabase");
const seed = seedSql(ROOT);
fs.writeFileSync(path.join(out, "seed.sql"), seed);

const migrations = migrationFiles(ROOT);
const parts = [
  "-- 205 nömrəli məktəb platforması — Supabase ilkin quraşdırma skripti.",
  "-- AVTOMATİK YARADILIB (npm run supabase:bundle). Əl ilə redaktə etməyin; mənbə: supabase/migrations/*.sql",
  "--",
  "-- Supabase Dashboard → SQL Editor → bu faylın bütün məzmununu yapışdırın → Run.",
  "-- Hamısı bir tranzaksiyadır: hər hansı xəta olarsa heç bir dəyişiklik saxlanmır.",
  "-- Baza artıq quraşdırılıbsa skript dayanır (mövcud məlumata toxunulmur). Sonrakı miqrasiyalar üçün: npm run db:migrate",
  "",
  "BEGIN;",
  "",
  MIGRATIONS_TABLE_SQL,
  "",
  `DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.schema_migrations) OR to_regclass('public.users') IS NOT NULL THEN
    RAISE EXCEPTION 'Baza artıq quraşdırılıb. Yeni miqrasiyalar üçün "npm run db:migrate" istifadə edin.';
  END IF;
END
$$;`,
  "",
];
for (const m of migrations) {
  parts.push(`-- ════════════════ ${m.name} ════════════════`, m.sql.trim(), "");
}
parts.push(
  "-- Miqrasiya qeydləri (npm run db:migrate bunları tanıyır və təkrar icra etmir)",
  `INSERT INTO public.schema_migrations (name, checksum) VALUES\n  ${migrations.map((m) => `('${m.name}', '${m.checksum}')`).join(",\n  ")};`,
  "",
  "-- ════════════════ seed (rollar, icazələr, zəng cədvəli) ════════════════",
  seed.trim(),
  "",
  "COMMIT;",
  ""
);
fs.writeFileSync(path.join(out, "setup.sql"), parts.join("\n"));
console.log(`[bundle] supabase/setup.sql (${migrations.length} miqrasiya) və supabase/seed.sql yaradıldı.`);
