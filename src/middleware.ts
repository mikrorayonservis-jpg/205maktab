/**
 * Edge middleware:
 *  1. CSRF cookie-ni (double-submit) təmin edir;
 *  2. Sessiya cookie-si olmayan istifadəçini qorunan səhifələrdən /login-ə yönləndirir
 *     (əsl autentifikasiya və icazə yoxlaması hər səhifədə/API-də serverdə DB ilə aparılır);
 *  3. Nonce əsaslı Content-Security-Policy və təhlükəsizlik başlıqlarını əlavə edir.
 */
import { NextResponse, type NextRequest } from "next/server";

const PROTECTED = ["/dashboard", "/profile", "/journal", "/grades", "/attendance", "/schedule", "/homework", "/notifications", "/editorial", "/reports", "/admin", "/official-journal"];
const SESSION_COOKIES = ["__Host-q205_sid", "q205_sid"];

function randomHex(bytes: number): string {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return Array.from(arr, (b) => b.toString(16).padStart(2, "0")).join("");
}

export function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const hasSession = SESSION_COOKIES.some((c) => Boolean(req.cookies.get(c)?.value));

  if (PROTECTED.some((p) => pathname === p || pathname.startsWith(p + "/")) && !hasSession) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = `?next=${encodeURIComponent(pathname + search)}`;
    return NextResponse.redirect(url);
  }

  const nonce = btoa(randomHex(16));
  const isDev = process.env.NODE_ENV !== "production";
  const isHttps = (process.env.SITE_URL || "").startsWith("https://");
  const csp = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https://i.ytimg.com https://i.vimeocdn.com",
    "font-src 'self' data:",
    "connect-src 'self'",
    "frame-src https://www.youtube-nocookie.com https://player.vimeo.com https://www.google.com https://www.openstreetmap.org",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'self'",
    isHttps ? "upgrade-insecure-requests" : "",
  ]
    .filter(Boolean)
    .join("; ");

  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("content-security-policy", csp);

  const res = NextResponse.next({ request: { headers: requestHeaders } });
  res.headers.set("Content-Security-Policy", csp);
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("X-Frame-Options", "SAMEORIGIN");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=()");
  if (isHttps) res.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");

  if (!req.cookies.get("q205_csrf")?.value) {
    res.cookies.set({ name: "q205_csrf", value: randomHex(24), httpOnly: false, sameSite: "lax", secure: isHttps, path: "/" });
  }
  return res;
}

export const config = {
  matcher: [
    {
      source: "/((?!_next/static|_next/image|favicon.ico|icon.png|media/|images/|robots.txt|sitemap.xml).*)",
      missing: [{ type: "header", key: "next-router-prefetch" }],
    },
  ],
};
