import { route, ok, parseQuery } from "@/lib/http";
import { db } from "@/lib/db";
import { z, isoDate } from "@/lib/validation";

export const GET = route(
  async ({ req }) => {
    const q = parseQuery(
      req,
      z.object({
        action: z.string().max(100).optional(),
        entity: z.string().max(100).optional(),
        userEmail: z.string().max(190).optional(),
        from: isoDate.optional(),
        to: isoDate.optional(),
        page: z.coerce.number().int().min(1).default(1),
        format: z.enum(["json", "csv"]).default("json"),
      })
    );
    const where = ["1=1"];
    const params: unknown[] = [];
    if (q.action) { where.push("a.action LIKE ?"); params.push(`${q.action.replace(/[%_\\]/g, "\\$&")}%`); }
    if (q.entity) { where.push("a.entity_type = ?"); params.push(q.entity); }
    if (q.userEmail) { where.push("u.email = ?"); params.push(q.userEmail.toLowerCase()); }
    if (q.from) { where.push("a.created_at >= ?"); params.push(`${q.from} 00:00:00`); }
    if (q.to) { where.push("a.created_at <= ?"); params.push(`${q.to} 23:59:59`); }
    const base = `FROM audit_logs a LEFT JOIN users u ON u.id = a.user_id WHERE ${where.join(" AND ")}`;
    const limit = q.format === "csv" ? 20000 : 50;
    const rows = await db.query(
      `SELECT a.id, a.created_at, u.email AS user_email, a.action, a.entity_type, a.entity_id, a.old_values, a.new_values, a.ip_address
         ${base} ORDER BY a.id DESC LIMIT ? OFFSET ?`,
      [...params, limit, q.format === "csv" ? 0 : (q.page - 1) * 50]
    );
    if (q.format === "csv") {
      const esc = (v: unknown) => {
        const s = v === null || v === undefined ? "" : typeof v === "string" ? v : JSON.stringify(v);
        const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
        return /[",\n;]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
      };
      const lines = ["ID;Tarix;İstifadəçi;Əməliyyat;Obyekt;Obyekt ID;Köhnə;Yeni;IP", ...rows.map((r) => [r.id, r.created_at, r.user_email, r.action, r.entity_type, r.entity_id, r.old_values, r.new_values, r.ip_address].map(esc).join(";"))];
      return new Response("﻿" + lines.join("\r\n"), {
        headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="audit-${new Date().toISOString().slice(0, 10)}.csv"` },
      });
    }
    const total = await db.queryOne<{ n: number }>(`SELECT COUNT(*) AS n ${base}`, params);
    return ok({ rows, total: Number(total?.n || 0), pageSize: 50 });
  },
  { permission: "audit.view" }
);
