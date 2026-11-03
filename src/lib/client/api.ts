"use client";
/**
 * Brauzer tərəfli API klienti: CSRF tokenini avtomatik əlavə edir, vahid xəta formatını açır.
 */

export class ApiClientError extends Error {
  constructor(public status: number, public code: string, message: string, public fields?: Record<string, string>) {
    super(message);
  }
}

function readCookie(name: string): string {
  if (typeof document === "undefined") return "";
  const m = document.cookie.split("; ").find((c) => c.startsWith(name + "="));
  return m ? decodeURIComponent(m.slice(name.length + 1)) : "";
}

type Body = Record<string, unknown> | unknown[] | FormData | undefined;

export async function api<T = unknown>(url: string, opts: { method?: string; body?: Body; signal?: AbortSignal } = {}): Promise<T> {
  const method = (opts.method || (opts.body ? "POST" : "GET")).toUpperCase();
  const headers: Record<string, string> = { Accept: "application/json" };
  if (method !== "GET") headers["X-CSRF-Token"] = readCookie("q205_csrf");
  let body: BodyInit | undefined;
  if (opts.body instanceof FormData) body = opts.body;
  else if (opts.body !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(opts.body);
  }
  let res: Response;
  try {
    res = await fetch(url, { method, headers, body, credentials: "same-origin", signal: opts.signal });
  } catch (e) {
    if ((e as Error).name === "AbortError") throw e;
    throw new ApiClientError(0, "NETWORK", "Serverlə əlaqə qurulmadı. İnternet bağlantınızı yoxlayın.");
  }
  let json: { ok?: boolean; data?: T; error?: { code: string; message: string; fields?: Record<string, string> } } = {};
  try {
    json = await res.json();
  } catch {
    /* boş cavab */
  }
  if (!res.ok || json.ok === false) {
    const err = json.error;
    throw new ApiClientError(res.status, err?.code || "ERROR", err?.message || "Xəta baş verdi.", err?.fields);
  }
  return json.data as T;
}
