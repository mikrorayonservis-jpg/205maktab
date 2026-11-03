import fs from "node:fs/promises";
import path from "node:path";
import { db } from "@/lib/db";
import { MIME_BY_EXT, resolveStoragePath } from "@/lib/storage";

/** İctimai media faylları (storage/public). Yalnız DB-də "public" kimi qeydə alınmış fayllar verilir. */
export async function GET(_req: Request, ctx: { params: Promise<{ key: string[] }> }) {
  const { key } = await ctx.params;
  const rel = key.join("/");
  if (!/^[A-Za-z0-9/_\-.]+$/.test(rel) || rel.includes("..")) return new Response("Tapılmadı", { status: 404 });
  const storageKey = `public/${rel}`;
  const row = await db.queryOne<{ mime_type: string; original_name: string }>("SELECT mime_type, original_name FROM files WHERE storage_key = ? AND visibility = 'public'", [storageKey]);
  if (!row) return new Response("Tapılmadı", { status: 404 });
  try {
    const data = await fs.readFile(resolveStoragePath(storageKey));
    const ext = path.extname(rel).slice(1).toLowerCase();
    return new Response(new Uint8Array(data), {
      headers: {
        "Content-Type": MIME_BY_EXT[ext] || row.mime_type,
        "Content-Length": String(data.length),
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
        "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(row.original_name)}`,
      },
    });
  } catch {
    return new Response("Tapılmadı", { status: 404 });
  }
}
