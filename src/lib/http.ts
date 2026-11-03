/**
 * API cavab strukturu, xəta sinfi və route handler sarğısı.
 * Cavab formatı: { ok: true, data } | { ok: false, error: { code, message, fields? } }
 * Sarğı autentifikasiya, icazə, CSRF və Origin yoxlamasını mərkəzləşdirir.
 */
import "server-only";
import { NextResponse, type NextRequest } from "next/server";
import { ZodError, type ZodTypeAny, type z } from "zod";
import { getCurrentUser, type CurrentUser } from "./auth/session";
import { can, type Permission } from "./auth/permissions";
import { verifyCsrf } from "./csrf";
import { isDuplicateError, isForeignKeyError } from "./db";

export class AppError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public fields?: Record<string, string>
  ) {
    super(message);
  }
}

export const Errors = {
  unauthorized: () => new AppError(401, "UNAUTHORIZED", "Bu əməliyyat üçün sistemə daxil olmalısınız."),
  forbidden: () => new AppError(403, "FORBIDDEN", "Bu əməliyyat üçün icazəniz yoxdur."),
  notFound: (what = "Məlumat") => new AppError(404, "NOT_FOUND", `${what} tapılmadı.`),
  badRequest: (message: string, fields?: Record<string, string>) => new AppError(400, "BAD_REQUEST", message, fields),
  conflict: (message: string) => new AppError(409, "CONFLICT", message),
  tooMany: (message = "Çox sayda cəhd edildi. Bir az sonra yenidən yoxlayın.") => new AppError(429, "RATE_LIMITED", message),
};

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ ok: true, data }, init);
}

export function fail(err: unknown) {
  if (err instanceof AppError) {
    return NextResponse.json(
      { ok: false, error: { code: err.code, message: err.message, fields: err.fields } },
      { status: err.status }
    );
  }
  if (err instanceof ZodError) {
    const fields: Record<string, string> = {};
    for (const issue of err.issues) {
      const key = issue.path.join(".") || "_";
      if (!fields[key]) fields[key] = issue.message;
    }
    return NextResponse.json(
      { ok: false, error: { code: "VALIDATION", message: "Formada səhvlər var.", fields } },
      { status: 422 }
    );
  }
  if (isDuplicateError(err)) {
    return NextResponse.json({ ok: false, error: { code: "DUPLICATE", message: "Belə qeyd artıq mövcuddur." } }, { status: 409 });
  }
  if (isForeignKeyError(err)) {
    return NextResponse.json(
      { ok: false, error: { code: "IN_USE", message: "Əlaqəli məlumatlar olduğu üçün əməliyyat mümkün deyil." } },
      { status: 409 }
    );
  }
  console.error("[api]", err);
  return NextResponse.json(
    { ok: false, error: { code: "SERVER_ERROR", message: "Serverdə gözlənilməz xəta baş verdi." } },
    { status: 500 }
  );
}

export interface RouteContext<P> {
  user: CurrentUser | null;
  params: P;
  req: NextRequest;
}

interface RouteOptions {
  /** true: daxil olmuş istifadəçi tələb olunur */
  auth?: boolean;
  /** Bu icazələrdən ən azı biri tələb olunur */
  permission?: Permission | Permission[];
  /** Mutasiya sorğuları üçün CSRF yoxlaması (default: true) */
  csrf?: boolean;
}

type Handler<P> = (ctx: RouteContext<P>) => Promise<Response>;

export function route<P = Record<string, string>>(handler: Handler<P>, opts: RouteOptions = {}) {
  return async (req: NextRequest, context: { params: Promise<P> }) => {
    try {
      const method = req.method.toUpperCase();
      const mutating = !["GET", "HEAD", "OPTIONS"].includes(method);
      if (mutating && opts.csrf !== false && !verifyCsrf(req)) {
        throw new AppError(403, "CSRF", "Sorğu təhlükəsizlik yoxlamasından keçmədi. Səhifəni yeniləyin.");
      }
      const user = await getCurrentUser();
      if ((opts.auth || opts.permission) && !user) throw Errors.unauthorized();
      if (opts.permission) {
        const list = Array.isArray(opts.permission) ? opts.permission : [opts.permission];
        if (!list.some((p) => can(user, p))) throw Errors.forbidden();
      }
      const params = (context?.params ? await context.params : ({} as P)) as P;
      const res = await handler({ user, params, req });
      res.headers.set("Cache-Control", "no-store");
      return res;
    } catch (err) {
      return fail(err);
    }
  };
}

/** JSON gövdəsini oxuyub zod sxemi ilə yoxlayır. */
export async function readJson<S extends ZodTypeAny>(req: NextRequest, schema: S): Promise<z.infer<S>> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw Errors.badRequest("Sorğunun gövdəsi düzgün JSON deyil.");
  }
  return schema.parse(body);
}

export function parseQuery<S extends ZodTypeAny>(req: NextRequest, schema: S): z.infer<S> {
  const obj: Record<string, string> = {};
  req.nextUrl.searchParams.forEach((v, k) => {
    obj[k] = v;
  });
  return schema.parse(obj);
}

export function requireUser(user: CurrentUser | null): CurrentUser {
  if (!user) throw Errors.unauthorized();
  return user;
}

export function clientIp(req: NextRequest): string {
  if (process.env.TRUST_PROXY === "1") {
    const fwd = req.headers.get("x-forwarded-for");
    if (fwd) return fwd.split(",")[0].trim().slice(0, 45);
    const real = req.headers.get("x-real-ip");
    if (real) return real.slice(0, 45);
  }
  return "local";
}
