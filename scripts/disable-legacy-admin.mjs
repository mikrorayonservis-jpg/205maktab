// Köhnə (v1) versiyadan qalmış standart admin hesabını deaktiv edir və bütün sessiyalarını ləğv edir.
// Hesab silinmir (audit izi qalır). Hesab mövcud deyilsə, heç nə dəyişmir.
// İstifadə: npm run admin:disable-legacy            (yalnız yoxlayır)
//           npm run admin:disable-legacy -- --apply  (deaktiv edir)
import { loadEnv, connect } from "./lib/env.mjs";

loadEnv();
const LEGACY = ["admin@qezet205.edu.az"];
const apply = process.argv.includes("--apply");

const conn = await connect();
try {
  for (const email of LEGACY) {
    const [[u]] = await conn.query("SELECT id, is_active FROM users WHERE email = ?", [email]);
    if (!u) {
      console.log(`✓ ${email}: mövcud deyil — tədbir lazım deyil.`);
      continue;
    }
    if (!apply) {
      console.log(`⚠ ${email}: tapıldı (#${u.id}, aktiv: ${Number(u.is_active) ? "bəli" : "xeyr"}). Deaktiv etmək üçün: npm run admin:disable-legacy -- --apply`);
      continue;
    }
    await conn.beginTransaction();
    try {
      await conn.query("UPDATE users SET is_active = 0, locked_until = NULL WHERE id = ?", [u.id]);
      const [r] = await conn.query("UPDATE sessions SET revoked_at = NOW() WHERE user_id = ? AND revoked_at IS NULL", [u.id]);
      await conn.query(
        "INSERT INTO audit_logs (user_id, action, entity_type, entity_id, new_values) VALUES (NULL, 'user.legacy_admin_disabled', 'user', ?, jsonb_build_object('via','cli'))",
        [u.id]
      );
      await conn.commit();
      console.log(`✓ ${email}: deaktiv edildi, ${r.affectedRows} sessiya ləğv olundu.`);
    } catch (e) {
      await conn.rollback();
      throw e;
    }
  }
} finally {
  await conn.end();
}
