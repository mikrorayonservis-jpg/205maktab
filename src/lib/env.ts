/**
 * Server konfiqurasiyası. Production-da vacib dəyişənlər yoxdursa tətbiq açılmır.
 */
import "server-only";
import type { ConnectionOptions } from "node:tls";

function req(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`${name} mühit dəyişəni təyin edilməyib`);
  return v;
}

export const isProd = process.env.NODE_ENV === "production";

let sslWarned = false;

/**
 * Postgres SSL: lokal ünvanlarda (localhost) SSL-siz; digər hallarda SSL məcburidir.
 * DATABASE_CA_CERT (Supabase → Database Settings → SSL certificate, PEM mətni) verilərsə
 * sertifikat tam yoxlanılır; verilməzsə bağlantı şifrələnir, lakin server sertifikatı yoxlanılmır.
 */
function sslConfig(url: URL): false | ConnectionOptions {
  const mode = (process.env.DATABASE_SSL || "").toLowerCase();
  const local = ["localhost", "127.0.0.1", "::1", "[::1]"].includes(url.hostname);
  if (mode === "disable" || (local && mode !== "require")) return false;
  const ca = process.env.DATABASE_CA_CERT?.replace(/\\n/g, "\n").trim();
  if (ca) return { ca, rejectUnauthorized: true };
  if (isProd && !sslWarned) {
    sslWarned = true;
    console.warn("[db] DATABASE_CA_CERT təyin edilməyib: bağlantı şifrələnir, lakin server sertifikatı yoxlanılmır.");
  }
  return { rejectUnauthorized: false };
}

export const env = {
  get db() {
    const url = new URL(req("DATABASE_URL"));
    // SSL rejimi yalnız sslConfig() ilə idarə olunur (URL-dəki sslmode pg tərəfindən fərqli şərh olunur)
    url.searchParams.delete("sslmode");
    return {
      url: url.toString(),
      ssl: sslConfig(url),
      // Serverless (Vercel) mühitində hər instansiya üçün kiçik hovuz; əsas hovuz Supabase pooler-dədir
      poolSize: Number(process.env.DB_POOL_SIZE || (process.env.VERCEL ? 3 : 10)),
    };
  },
  siteUrl: (process.env.SITE_URL || "http://localhost:3000").replace(/\/$/, ""),
  storageDir: process.env.STORAGE_DIR || "storage",
  trustProxy: process.env.TRUST_PROXY === "1",
  sessionDays: Number(process.env.SESSION_TTL_DAYS || 7),
  passwordResetMinutes: Number(process.env.PASSWORD_RESET_TTL_MINUTES || 60),
  supabase: {
    url: (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "").replace(/\/$/, ""),
    // Yalnız serverdə: Storage əməliyyatları üçün. Heç vaxt NEXT_PUBLIC_ prefiksi ilə verilməməlidir.
    secretKey: process.env.SUPABASE_SECRET_KEY || "",
    bucket: process.env.SUPABASE_STORAGE_BUCKET || "school-files",
  },
  smtp: {
    host: process.env.SMTP_HOST || "",
    port: Number(process.env.SMTP_PORT || 587),
    user: process.env.SMTP_USER || "",
    password: process.env.SMTP_PASSWORD || "",
    secure: process.env.SMTP_SECURE === "1",
    from: process.env.MAIL_FROM || "",
  },
};
