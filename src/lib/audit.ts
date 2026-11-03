/**
 * Audit jurnalı: kim, nə vaxt, hansı obyektdə nəyi dəyişdi.
 * Həssas sahələr (parol hash-ləri, tokenlər) avtomatik çıxarılır.
 */
import "server-only";
import type { NextRequest } from "next/server";
import { db, type Db } from "./db";
import { clientIp } from "./http";

const SENSITIVE = /password|token|hash|secret/i;

function clean(v: unknown): unknown {
  if (v === undefined) return null;
  if (!v || typeof v !== "object") return v;
  const out: Record<string, unknown> = {};
  for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
    if (!SENSITIVE.test(k)) out[k] = val;
  }
  return out;
}

export interface AuditEntry {
  userId: number | null;
  action: string;
  entityType: string;
  entityId?: number | null;
  oldValues?: unknown;
  newValues?: unknown;
  req?: NextRequest;
}

export async function audit(entry: AuditEntry, tx: Db = db) {
  await tx.execute(
    `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, old_values, new_values, ip_address, user_agent)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      entry.userId,
      entry.action.slice(0, 100),
      entry.entityType.slice(0, 100),
      entry.entityId ?? null,
      entry.oldValues === undefined ? null : JSON.stringify(clean(entry.oldValues)),
      entry.newValues === undefined ? null : JSON.stringify(clean(entry.newValues)),
      entry.req ? clientIp(entry.req) : null,
      entry.req ? (entry.req.headers.get("user-agent") || "").slice(0, 400) : null,
    ]
  );
}
