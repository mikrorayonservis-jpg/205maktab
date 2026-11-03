// Lokal storage/ qovluğundakı faylları Supabase Storage bucket-ına yükləyir (bir dəfəlik köçürmə).
// Yalnız `files` cədvəlində qeydə alınmış fayllar yüklənir; bucket-da artıq olan fayllar ötürülür (üzərinə yazılmır).
// İstifadə: npm run storage:upload   (SUPABASE_SECRET_KEY, NEXT_PUBLIC_SUPABASE_URL və DATABASE_URL tələb olunur)
import fs from "node:fs";
import path from "node:path";
import { loadEnv, connect, ROOT } from "./lib/env.mjs";
import { putObject, storageTarget } from "./lib/storage.mjs";

loadEnv();
const target = storageTarget();
if (target.kind !== "supabase") {
  console.error("[storage:upload] SUPABASE_SECRET_KEY və NEXT_PUBLIC_SUPABASE_URL (və ya SUPABASE_URL) təyin edilməyib.");
  process.exit(1);
}
const localDir = path.resolve(ROOT, process.env.STORAGE_DIR || "storage");

const conn = await connect();
let uploaded = 0;
let skipped = 0;
const missing = [];
try {
  const [files] = await conn.query("SELECT storage_key, mime_type FROM files ORDER BY id");
  for (const f of files) {
    const full = path.join(localDir, f.storage_key);
    if (!fs.existsSync(full)) {
      missing.push(f.storage_key);
      continue;
    }
    try {
      await putObject(target, f.storage_key, fs.readFileSync(full), f.mime_type);
      uploaded++;
    } catch (e) {
      if (/exists|Duplicate/i.test(e.message)) skipped++;
      else throw e;
    }
  }
} finally {
  await conn.end();
}
console.log(`[storage:upload] ${target.label}: ${uploaded} yükləndi, ${skipped} artıq mövcud idi.`);
if (missing.length) console.warn(`[storage:upload] Lokal diskdə tapılmayan ${missing.length} fayl:\n  ${missing.slice(0, 20).join("\n  ")}`);
