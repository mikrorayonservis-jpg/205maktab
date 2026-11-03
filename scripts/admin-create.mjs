// Super Admin hesabının təhlükəsiz yaradılması və ya parolunun yenilənməsi (interaktiv).
// Parol heç bir faylda saxlanmır; yalnız terminalda daxil edilir.
// İstifadə: npm run admin:create
import readline from "node:readline";
import { hash } from "@node-rs/argon2";
import { loadEnv, connect } from "./lib/env.mjs";

loadEnv();

function ask(question, { hidden = false } = {}) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    if (hidden) {
      rl._writeToOutput = (s) => { if (s.includes(question)) rl.output.write(s); else rl.output.write("*"); };
    }
    rl.question(question, (answer) => { rl.close(); if (hidden) process.stdout.write("\n"); resolve(answer.trim()); });
  });
}

function strong(p) {
  return p.length >= 12 && /[a-zəğıöşçü]/.test(p) && /[A-ZƏĞİÖŞÇÜ]/.test(p) && /\d/.test(p);
}

async function run() {
  const email = (await ask("Administrator e-poçtu: ")).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("E-poçt düzgün deyil.");
  const firstName = await ask("Ad: ");
  const lastName = await ask("Soyad: ");
  const p1 = await ask("Parol (ən azı 12 simvol, böyük/kiçik hərf və rəqəm): ", { hidden: true });
  if (!strong(p1)) throw new Error("Parol kifayət qədər güclü deyil.");
  const p2 = await ask("Parolu təkrar daxil edin: ", { hidden: true });
  if (p1 !== p2) throw new Error("Parollar uyğun gəlmir.");

  const passwordHash = await hash(p1, { algorithm: 2, memoryCost: 19456, timeCost: 2, parallelism: 1 });
  const conn = await connect();
  await conn.beginTransaction();
  try {
    const [[existing]] = await conn.query("SELECT id FROM users WHERE email = ?", [email]);
    let userId;
    if (existing) {
      userId = existing.id;
      await conn.query(
        `UPDATE users SET password_hash = ?, first_name = ?, last_name = ?, role = 'super_admin', is_active = 1,
           email_verified = 1, email_verified_at = COALESCE(email_verified_at, NOW()), password_changed_at = NOW(),
           failed_login_count = 0, locked_until = NULL, must_change_password = 0, deleted_at = NULL WHERE id = ?`,
        [passwordHash, firstName || null, lastName || null, userId]
      );
      await conn.query("UPDATE sessions SET revoked_at = NOW() WHERE user_id = ? AND revoked_at IS NULL", [userId]);
    } else {
      const [res] = await conn.query(
        `INSERT INTO users (email, first_name, last_name, password_hash, role, is_active, email_verified, email_verified_at, password_changed_at)
         VALUES (?, ?, ?, ?, 'super_admin', 1, 1, NOW(), NOW())`,
        [email, firstName || null, lastName || null, passwordHash]
      );
      userId = res.insertId;
    }
    await conn.query("INSERT INTO user_roles (user_id, role_id) SELECT ?::int, id FROM roles WHERE code = 'super_admin' ON CONFLICT DO NOTHING", [userId]);
    await conn.query(
      "INSERT INTO audit_logs (user_id, action, entity_type, entity_id, new_values) VALUES (?, ?, 'user', ?, jsonb_build_object('via','cli'))",
      [userId, existing ? "admin.password_reset_cli" : "admin.create_cli", userId]
    );
    await conn.commit();
    console.log(existing ? "Administratorun parolu yeniləndi, köhnə sessiyalar bağlandı." : "Super Admin hesabı yaradıldı.");
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    await conn.end();
  }
}

run().catch((e) => { console.error("[xəta]", e.message); process.exit(1); });
