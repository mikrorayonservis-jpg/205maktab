/**
 * Server konfiqurasiyası. Production-da vacib dəyişənlər yoxdursa tətbiq açılmır.
 */
import "server-only";

function req(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`${name} mühit dəyişəni təyin edilməyib`);
  return v;
}

export const isProd = process.env.NODE_ENV === "production";

export const env = {
  get db() {
    return {
      host: req("DB_HOST"),
      port: Number(process.env.DB_PORT || 3306),
      user: req("DB_USER"),
      password: req("DB_PASSWORD"),
      database: req("DB_NAME"),
    };
  },
  siteUrl: (process.env.SITE_URL || "http://localhost:3000").replace(/\/$/, ""),
  storageDir: process.env.STORAGE_DIR || "storage",
  trustProxy: process.env.TRUST_PROXY === "1",
  sessionDays: Number(process.env.SESSION_TTL_DAYS || 7),
  passwordResetMinutes: Number(process.env.PASSWORD_RESET_TTL_MINUTES || 60),
  smtp: {
    host: process.env.SMTP_HOST || "",
    port: Number(process.env.SMTP_PORT || 587),
    user: process.env.SMTP_USER || "",
    password: process.env.SMTP_PASSWORD || "",
    secure: process.env.SMTP_SECURE === "1",
    from: process.env.MAIL_FROM || "",
  },
};
