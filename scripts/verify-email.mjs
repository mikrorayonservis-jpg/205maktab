// SMTP hələ qurulmayıbsa, bir hesabın e-poçtunu əl ilə təsdiqləyir (audit jurnalına yazılır).
// İstifadə: npm run user:verify-email -- ad@example.com
import { loadEnv, connect } from "./lib/env.mjs";

loadEnv();
const email = String(process.argv[2] || "").trim().toLowerCase();
if (!email) {
  console.error("İstifadə: npm run user:verify-email -- <e-poçt>");
  process.exit(1);
}

const conn = await connect();
try {
  const [[u]] = await conn.query("SELECT id, email_verified, deleted_at FROM users WHERE email = ?", [email]);
  if (!u || u.deleted_at) {
    console.log(`✗ "${email}" e-poçtu ilə aktiv hesab yoxdur.`);
    process.exit(2);
  }
  if (Number(u.email_verified)) {
    console.log(`✓ Hesab #${u.id} artıq təsdiqlənib.`);
    process.exit(0);
  }
  await conn.query("UPDATE users SET email_verified = 1, email_verified_at = NOW() WHERE id = ?", [u.id]);
  await conn.query(
    "INSERT INTO audit_logs (user_id, action, entity_type, entity_id, new_values) VALUES (NULL, 'user.email_verified_manual', 'user', ?, ?)",
    [u.id, JSON.stringify({ reason: "SMTP konfiqurasiya edilməyib; əl ilə təsdiqləndi" })]
  );
  console.log(`✓ Hesab #${u.id} (${email}) e-poçtu təsdiqləndi. İndi daxil ola bilər.`);
} finally {
  await conn.end();
}
