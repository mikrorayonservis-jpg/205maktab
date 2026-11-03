/**
 * CSRF müdafiəsi: double-submit cookie + Origin/Referer yoxlaması.
 * Cookie middleware tərəfindən təyin edilir; klient hər mutasiya sorğusunda X-CSRF-Token göndərir.
 */
import type { NextRequest } from "next/server";

export const CSRF_COOKIE = "q205_csrf";
export const CSRF_HEADER = "x-csrf-token";

function timingSafeEqualStr(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function sameOrigin(req: NextRequest): boolean {
  const host = req.headers.get("x-forwarded-host") && process.env.TRUST_PROXY === "1"
    ? req.headers.get("x-forwarded-host")
    : req.headers.get("host");
  const origin = req.headers.get("origin");
  const check = (value: string) => {
    try {
      const u = new URL(value);
      if (host && u.host === host) return true;
      const site = process.env.SITE_URL;
      return Boolean(site && new URL(site).host === u.host);
    } catch {
      return false;
    }
  };
  if (origin && origin !== "null") return check(origin);
  const referer = req.headers.get("referer");
  if (referer) return check(referer);
  // Brauzer olmayan klientlər (Origin/Referer yoxdur) üçün token yoxlaması kifayətdir
  return true;
}

export function verifyCsrf(req: NextRequest): boolean {
  const cookie = req.cookies.get(CSRF_COOKIE)?.value || "";
  const header = req.headers.get(CSRF_HEADER) || "";
  if (cookie.length < 16 || !timingSafeEqualStr(cookie, header)) return false;
  return sameOrigin(req);
}
