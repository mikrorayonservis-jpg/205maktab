import { route, Errors } from "@/lib/http";
import { db } from "@/lib/db";
import { id as idSchema } from "@/lib/validation";
import { PROXY_MAX_BYTES, readObject, signedDownloadUrl } from "@/lib/storage";
import { canAccessPrivateFile } from "@/server/homework";

/** Şəxsi fayllar: hər sorğuda giriş hüququ yoxlanılır. */
export const GET = route<{ id: string }>(
  async ({ user, params }) => {
    const fileId = idSchema.parse(params.id);
    const f = await db.queryOne<{ storage_key: string; mime_type: string; original_name: string; visibility: string; size_bytes: number }>(
      "SELECT storage_key, mime_type, original_name, visibility, size_bytes FROM files WHERE id = ?",
      [fileId]
    );
    if (!f || !(f.visibility === "public" || (await canAccessPrivateFile(user!, fileId)))) throw Errors.notFound("Fayl");
    // Böyük fayllar: giriş yoxlandıqdan sonra 60 saniyəlik imzalı keçidə yönləndirmə (yükləmə kimi)
    if (f.size_bytes > PROXY_MAX_BYTES) {
      const signed = await signedDownloadUrl(f.storage_key, f.original_name);
      if (signed) return new Response(null, { status: 302, headers: { Location: signed } });
    }
    const data = await readObject(f.storage_key);
    if (!data) throw Errors.notFound("Fayl");
    const inline = f.mime_type === "application/pdf" || f.mime_type.startsWith("image/");
    return new Response(new Uint8Array(data), {
      headers: {
        "Content-Type": f.mime_type,
        "Content-Length": String(data.length),
        "Content-Disposition": `${inline ? "inline" : "attachment"}; filename*=UTF-8''${encodeURIComponent(f.original_name)}`,
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; sandbox",
        "Cache-Control": "private, no-store",
      },
    });
  },
  { auth: true }
);
