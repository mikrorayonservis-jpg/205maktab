/**
 * DB əsaslı sabit pəncərə rate limit (bir neçə Node prosesi arasında işləyir).
 */
import "server-only";
import { db } from "./db";
import { Errors } from "./http";

export async function hit(key: string, limit: number, windowSeconds: number): Promise<{ allowed: boolean; count: number }> {
  const bucket = key.slice(0, 191);
  const res = await db.execute(
    `INSERT INTO rate_limits (bucket_key, window_start, hits) VALUES (?, NOW(), 1)
     ON CONFLICT (bucket_key) DO UPDATE SET
       hits = CASE WHEN rate_limits.window_start < NOW() - make_interval(secs => ?) THEN 1 ELSE rate_limits.hits + 1 END,
       window_start = CASE WHEN rate_limits.window_start < NOW() - make_interval(secs => ?) THEN NOW() ELSE rate_limits.window_start END
     RETURNING hits`,
    [bucket, windowSeconds, windowSeconds]
  );
  const count = Number(res.rows[0]?.hits || 0);
  return { allowed: count <= limit, count };
}

export async function enforce(key: string, limit: number, windowSeconds: number, message?: string) {
  const r = await hit(key, limit, windowSeconds);
  if (!r.allowed) throw Errors.tooMany(message);
}

export async function resetLimit(key: string) {
  await db.execute("DELETE FROM rate_limits WHERE bucket_key = ?", [key.slice(0, 191)]);
}

/**
 * IP üzrə limit. IP məlum deyilsə (TRUST_PROXY=0 və ya proxy başlığı yoxdur) — limit tətbiq edilmir,
 * çünki əks halda bütün istifadəçilər eyni "local" açarını paylaşar və bir nəfərin cəhdləri hamını bloklayar.
 * Hesab (e-poçt) üzrə limitlər ayrıca və həmişə işləyir.
 */
export async function enforceIp(scope: string, ip: string, limit: number, windowSeconds: number, message?: string) {
  if (!ip || ip === "local") return;
  await enforce(`${scope}:ip:${ip}`, limit, windowSeconds, message);
}
