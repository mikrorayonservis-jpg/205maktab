/**
 * Fayl yükləmələri: ölçü limiti, "magic bytes" ilə MIME yoxlaması, şəkillərin WebP-yə çevrilməsi
 * (EXIF/GPS metadata silinir), ictimai və şəxsi saxlama. Fayllar heç vaxt public/ qovluğuna yazılmır.
 *
 * Saxlama yeri:
 *  - SUPABASE_URL (və ya NEXT_PUBLIC_SUPABASE_URL) + SUPABASE_SECRET_KEY təyin edilibsə → Supabase Storage
 *    (şəxsi bucket; fayllar yalnız tətbiqin /media və /api/files marşrutları ilə, icazə yoxlanaraq verilir);
 *  - əks halda → lokal STORAGE_DIR qovluğu (development). Vercel-də lokal disk müvəqqətidir, ona görə
 *    orada Supabase Storage konfiqurasiyası olmadan yükləmə qəbul edilmir.
 */
import "server-only";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { db } from "./db";
import { env } from "./env";
import { Errors } from "./http";

export type FileKind = "image" | "pdf" | "document";
export type Visibility = "public" | "private";

/** Vercel funksiyalarının sorğu/cavab gövdəsi ~4.5 MB ilə məhdudlaşır. */
const PLATFORM_BODY_LIMIT = process.env.VERCEL ? 4 * 1024 * 1024 : Infinity;

export const LIMITS = {
  image: Math.min(8 * 1024 * 1024, PLATFORM_BODY_LIMIT),
  pdf: Math.min(15 * 1024 * 1024, PLATFORM_BODY_LIMIT),
  document: Math.min(10 * 1024 * 1024, PLATFORM_BODY_LIMIT),
};

/** Bu ölçüdən böyük fayllar funksiya vasitəsilə deyil, qısamüddətli imzalı keçidlə verilir. */
export const PROXY_MAX_BYTES = 4 * 1024 * 1024;

const g = globalThis as unknown as { __q205Supabase?: SupabaseClient };

export function usesSupabaseStorage(): boolean {
  return Boolean(env.supabase.url && env.supabase.secretKey);
}

/** Yalnız serverdə istifadə olunan Supabase klienti (secret key). Bir dəfə yaradılır. */
function supabaseAdmin(): SupabaseClient {
  if (!g.__q205Supabase) {
    g.__q205Supabase = createClient(env.supabase.url, env.supabase.secretKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
  }
  return g.__q205Supabase;
}

function assertKey(storageKey: string) {
  if (!/^(public|private)\/[A-Za-z0-9/_\-.]+$/.test(storageKey) || storageKey.includes("..")) {
    throw Errors.badRequest("Fayl yolu yanlışdır.");
  }
}

async function writeObject(storageKey: string, data: Buffer, mime: string) {
  assertKey(storageKey);
  if (usesSupabaseStorage()) {
    const { error } = await supabaseAdmin().storage.from(env.supabase.bucket).upload(storageKey, data, { contentType: mime, upsert: false });
    if (error) throw new Error(`[storage] yükləmə alınmadı: ${error.message}`);
    return;
  }
  if (process.env.VERCEL) {
    throw new Error("[storage] Vercel-də SUPABASE_SECRET_KEY və SUPABASE_URL təyin edilməyib — fayllar saxlanıla bilməz.");
  }
  const full = resolveStoragePath(storageKey);
  await fs.mkdir(path.dirname(full), { recursive: true });
  await fs.writeFile(full, data, { flag: "wx" });
}

async function removeObject(storageKey: string) {
  try {
    if (usesSupabaseStorage()) await supabaseAdmin().storage.from(env.supabase.bucket).remove([storageKey]);
    else await fs.unlink(resolveStoragePath(storageKey));
  } catch {
    /* təmizləmə uğursuz olsa da əsas xəta qaytarılır */
  }
}

/** Faylın məzmunu; tapılmasa null. */
export async function readObject(storageKey: string): Promise<Buffer | null> {
  assertKey(storageKey);
  if (usesSupabaseStorage()) {
    const { data, error } = await supabaseAdmin().storage.from(env.supabase.bucket).download(storageKey);
    if (error || !data) return null;
    return Buffer.from(await data.arrayBuffer());
  }
  try {
    return await fs.readFile(resolveStoragePath(storageKey));
  } catch {
    return null;
  }
}

/**
 * Böyük fayllar üçün qısamüddətli (60 san.) imzalı keçid. Yalnız giriş hüququ yoxlandıqdan sonra çağırılır.
 * Lokal saxlamada null qaytarır (fayl birbaşa verilir).
 */
export async function signedDownloadUrl(storageKey: string, downloadName?: string): Promise<string | null> {
  assertKey(storageKey);
  if (!usesSupabaseStorage()) return null;
  const { data, error } = await supabaseAdmin()
    .storage.from(env.supabase.bucket)
    .createSignedUrl(storageKey, 60, downloadName ? { download: downloadName } : undefined);
  if (error || !data) return null;
  return data.signedUrl;
}

interface Detected {
  mime: string;
  ext: string;
  kind: FileKind;
}

function detect(buf: Buffer): Detected | null {
  if (buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return { mime: "image/jpeg", ext: "jpg", kind: "image" };
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return { mime: "image/png", ext: "png", kind: "image" };
  if (buf.subarray(0, 4).toString("ascii") === "RIFF" && buf.subarray(8, 12).toString("ascii") === "WEBP") return { mime: "image/webp", ext: "webp", kind: "image" };
  if (buf.subarray(0, 5).toString("ascii") === "%PDF-") return { mime: "application/pdf", ext: "pdf", kind: "pdf" };
  // DOCX/XLSX/PPTX (ZIP konteyneri) — yalnız şəxsi tapşırıq faylları üçün
  if (buf[0] === 0x50 && buf[1] === 0x4b && buf[2] === 0x03 && buf[3] === 0x04) return { mime: "application/zip", ext: "zip", kind: "document" };
  return null;
}

const OFFICE: Record<string, string> = {
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
};

export interface StoredFile {
  id: number;
  url: string;
  mimeType: string;
  sizeBytes: number;
  originalName: string;
  width: number | null;
  height: number | null;
}

export function publicUrl(storageKey: string): string {
  return `/media/${storageKey.replace(/^public\//, "")}`;
}

export function fileUrl(row: { id: number; storage_key: string; visibility: string }): string {
  return row.visibility === "public" ? publicUrl(row.storage_key) : `/api/files/${row.id}`;
}

export function storageRoot(): string {
  return path.resolve(process.cwd(), env.storageDir);
}

export function resolveStoragePath(storageKey: string): string {
  const root = storageRoot();
  const full = path.resolve(root, storageKey);
  if (!full.startsWith(root + path.sep)) throw Errors.badRequest("Fayl yolu yanlışdır.");
  return full;
}

function safeOriginalName(name: string): string {
  return (name || "fayl").replace(/[\\/\0<>:"|?*\u0000-\u001f]/g, "_").slice(0, 200);
}

export async function storeUpload(
  file: File,
  opts: { allowed: FileKind[]; visibility: Visibility; purpose: string; ownerUserId: number; maxImageWidth?: number }
): Promise<StoredFile> {
  if (!(file instanceof File) || file.size === 0) throw Errors.badRequest("Fayl seçilməyib.");
  const maxAllowed = Math.max(...opts.allowed.map((k) => LIMITS[k]));
  if (file.size > maxAllowed) throw Errors.badRequest(`Fayl çox böyükdür (maksimum ${Math.round(maxAllowed / 1024 / 1024)} MB).`);

  let buf: Buffer = Buffer.from(await file.arrayBuffer());
  const det = detect(buf);
  if (!det || !opts.allowed.includes(det.kind)) {
    throw Errors.badRequest("Bu fayl növünə icazə verilmir. İcazə verilən: " + opts.allowed.map((k) => (k === "image" ? "JPG/PNG/WebP" : k === "pdf" ? "PDF" : "DOCX/XLSX/PPTX")).join(", "));
  }
  if (buf.length > LIMITS[det.kind]) throw Errors.badRequest(`Fayl çox böyükdür (maksimum ${Math.round(LIMITS[det.kind] / 1024 / 1024)} MB).`);

  let mime = det.mime;
  let ext = det.ext;
  let width: number | null = null;
  let height: number | null = null;
  const originalName = safeOriginalName(file.name);

  if (det.kind === "document") {
    const e = path.extname(originalName).slice(1).toLowerCase();
    if (!OFFICE[e]) throw Errors.badRequest("Yalnız DOCX, XLSX və PPTX sənədlərinə icazə verilir.");
    mime = OFFICE[e];
    ext = e;
  }

  if (det.kind === "image") {
    try {
      const sharp = (await import("sharp")).default;
      const img = sharp(buf, { failOn: "error", limitInputPixels: 50_000_000 }).rotate();
      const out = await img
        .resize({ width: opts.maxImageWidth ?? 2000, withoutEnlargement: true })
        .webp({ quality: 82 })
        .toBuffer({ resolveWithObject: true });
      buf = out.data;
      width = out.info.width;
      height = out.info.height;
      mime = "image/webp";
      ext = "webp";
    } catch {
      throw Errors.badRequest("Şəkil faylı oxuna bilmədi və ya zədələnib.");
    }
  }

  const now = new Date();
  const dir = `${opts.visibility}/${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, "0")}`;
  const storageKey = `${dir}/${crypto.randomBytes(16).toString("hex")}.${ext}`;
  await writeObject(storageKey, buf, mime);

  let res;
  try {
    res = await db.execute(
      `INSERT INTO files (storage_key, original_name, mime_type, size_bytes, width, height, visibility, purpose, owner_user_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [storageKey, originalName, mime, buf.length, width, height, opts.visibility, opts.purpose.slice(0, 50), opts.ownerUserId]
    );
  } catch (err) {
    await removeObject(storageKey); // qeydsiz (yetim) fayl qalmasın
    throw err;
  }
  return {
    id: res.insertId,
    url: opts.visibility === "public" ? publicUrl(storageKey) : `/api/files/${res.insertId}`,
    mimeType: mime,
    sizeBytes: buf.length,
    originalName,
    width,
    height,
  };
}

export const MIME_BY_EXT: Record<string, string> = {
  webp: "image/webp",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  pdf: "application/pdf",
  ...OFFICE,
};
