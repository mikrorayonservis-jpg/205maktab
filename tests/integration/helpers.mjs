// Test klienti: cookie qabı, CSRF tokeni və JSON köməkçiləri.
import mysql from "mysql2/promise";
import { loadEnv } from "../../scripts/lib/env.mjs";

loadEnv();
export const BASE = process.env.TEST_BASE_URL;
export const PASSWORD = process.env.TEST_PASSWORD;
export const IDS = JSON.parse(process.env.TEST_IDS || "{}");

export class Client {
  constructor() {
    this.jar = new Map();
    // Hər klient ayrı IP kimi görünür (server TRUST_PROXY=1 ilə işləyir), IP üzrə limitlər testləri bloklamasın
    this.ip = `10.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250) + 1}`;
  }
  cookieHeader() {
    return [...this.jar].map(([k, v]) => `${k}=${v}`).join("; ");
  }
  store(res) {
    for (const c of res.headers.getSetCookie()) {
      const [pair] = c.split(";");
      const i = pair.indexOf("=");
      const k = pair.slice(0, i).trim();
      const v = pair.slice(i + 1).trim();
      if (!v || /max-age=0/i.test(c)) this.jar.delete(k);
      else this.jar.set(k, v);
    }
  }
  async raw(path, { method = "GET", body, headers = {}, csrf = true, origin = BASE } = {}) {
    if (!this.jar.has("q205_csrf")) {
      const r = await fetch(`${BASE}/`, { redirect: "manual", headers: { cookie: this.cookieHeader(), "x-forwarded-for": this.ip } });
      this.store(r);
    }
    const h = { cookie: this.cookieHeader(), "x-forwarded-for": this.ip, ...headers };
    if (origin) h.origin = origin;
    if (method !== "GET" && csrf) h["x-csrf-token"] = this.jar.get("q205_csrf") || "";
    let payload = body;
    if (body && !(body instanceof FormData)) {
      h["content-type"] = "application/json";
      payload = JSON.stringify(body);
    }
    const res = await fetch(`${BASE}${path}`, { method, headers: h, body: payload, redirect: "manual" });
    this.store(res);
    return res;
  }
  async json(path, opts) {
    const res = await this.raw(path, opts);
    let data = null;
    try {
      data = await res.json();
    } catch {
      /* JSON deyil */
    }
    return { status: res.status, body: data };
  }
  get(p) { return this.json(p); }
  post(p, body, opts = {}) { return this.json(p, { ...opts, method: "POST", body }); }
  patch(p, body) { return this.json(p, { method: "PATCH", body }); }
  put(p, body) { return this.json(p, { method: "PUT", body }); }
  del(p, body) { return this.json(p, { method: "DELETE", body }); }
}

export async function login(email, password = PASSWORD) {
  const c = new Client();
  const r = await c.post("/api/auth/login", { email, password });
  if (r.status !== 200) throw new Error(`Login uğursuz (${email}): ${r.status} ${JSON.stringify(r.body)}`);
  return c;
}

let pool;
export function db() {
  if (!pool) {
    pool = mysql.createPool({
      host: process.env.DB_HOST, port: Number(process.env.DB_PORT || 3306), user: process.env.DB_USER, password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME_TEST, charset: "utf8mb4", dateStrings: true, connectionLimit: 3,
    });
  }
  return pool;
}
export async function q(sql, params = []) {
  const [rows] = await db().query(sql, params);
  return rows;
}
export async function closeDb() {
  if (pool) await pool.end();
  pool = undefined;
}

export function today() {
  const f = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Baku", year: "numeric", month: "2-digit", day: "2-digit" });
  return f.format(new Date());
}

/** Aktiv tədris ili daxilində bugünkü və ya ən yaxın keçmiş Bazar ertəsi */
export function lastMonday() {
  const d = new Date(`${today()}T12:00:00Z`);
  const wd = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() - (wd - 1));
  return d.toISOString().slice(0, 10);
}

export const PNG_1PX = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=", "base64");
