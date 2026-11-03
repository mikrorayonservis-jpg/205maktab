// Hesab diaqnostikası: "daxil ola bilmirəm" hallarını yoxlamaq üçün. Parol, hash və tokenlər HEÇ VAXT göstərilmir.
// İstifadə: npm run user:status -- ad@example.com
import { loadEnv, connect } from "./lib/env.mjs";

loadEnv();
const email = String(process.argv[2] || "").trim().toLowerCase();
if (!email) {
  console.error("İstifadə: npm run user:status -- <e-poçt>");
  process.exit(1);
}

const conn = await connect();
try {
  const [[u]] = await conn.query(
    `SELECT id, email, role, is_active, email_verified, failed_login_count, locked_until, deleted_at, created_at,
            (password_hash IS NOT NULL AND password_hash <> '') AS has_password,
            (locked_until IS NOT NULL AND locked_until > NOW()) AS is_locked
       FROM users WHERE email = ?`,
    [email]
  );
  if (!u) {
    console.log(`✗ "${email}" e-poçtu ilə hesab YOXDUR.`);
    console.log("  Administrator üçün: npm run admin:create  ·  digər istifadəçilər üçün: Admin paneli → Dəvət kodları");
    process.exit(2);
  }
  const [roles] = await conn.query("SELECT r.code FROM user_roles ur JOIN roles r ON r.id = ur.role_id WHERE ur.user_id = ?", [u.id]);
  const [[sess]] = await conn.query("SELECT COUNT(*) AS n FROM sessions WHERE user_id = ? AND revoked_at IS NULL AND expires_at > NOW()", [u.id]);
  const yes = (v) => (Number(v) ? "bəli" : "xeyr");
  console.log(`Hesab #${u.id}  ${u.email}`);
  console.log(`  Rollar:              ${roles.map((r) => r.code).join(", ") || "(rol təyin edilməyib)"}`);
  console.log(`  Aktiv:               ${yes(u.is_active)}`);
  console.log(`  Silinib:             ${u.deleted_at ? "bəli (" + u.deleted_at + ")" : "xeyr"}`);
  console.log(`  E-poçt təsdiqlənib:  ${yes(u.email_verified)}`);
  console.log(`  Parol təyin edilib:  ${yes(u.has_password)}`);
  console.log(`  Uğursuz cəhdlər:     ${u.failed_login_count}`);
  console.log(`  Bloklanıb:           ${Number(u.is_locked) ? "bəli, " + u.locked_until + " tarixinədək" : "xeyr"}`);
  console.log(`  Aktiv sessiyalar:    ${sess.n}`);
  const problems = [];
  if (!Number(u.is_active) || u.deleted_at) problems.push("hesab deaktivdir və ya silinib");
  if (!Number(u.email_verified)) problems.push("e-poçt təsdiqlənməyib");
  if (Number(u.is_locked)) problems.push("çox sayda uğursuz cəhd səbəbindən müvəqqəti bloklanıb");
  if (!roles.length) problems.push("heç bir rol təyin edilməyib");
  console.log(problems.length ? `⚠ Ehtimal olunan səbəb: ${problems.join("; ")}.` : "✓ Hesab qaydasındadır — problem varsa, parolu yoxlayın (admin üçün: npm run admin:create ilə yeniləyin).");
} finally {
  await conn.end();
}
