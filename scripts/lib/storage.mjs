// Skriptlər üçün fayl saxlama: tətbiqlə eyni qayda (src/lib/storage.ts) —
// SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SECRET_KEY varsa Supabase Storage, əks halda lokal STORAGE_DIR.
import fs from "node:fs/promises";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { ROOT } from "./env.mjs";

export function storageTarget() {
  const url = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "").replace(/\/$/, "");
  const key = process.env.SUPABASE_SECRET_KEY || "";
  const bucket = process.env.SUPABASE_STORAGE_BUCKET || "school-files";
  if (url && key) {
    const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
    return { kind: "supabase", bucket, client, label: `Supabase Storage (${bucket})` };
  }
  const dir = path.resolve(ROOT, process.env.STORAGE_DIR || "storage");
  return { kind: "local", dir, label: `lokal qovluq (${dir})` };
}

export async function putObject(target, key, data, mime, { upsert = false } = {}) {
  if (target.kind === "supabase") {
    const { error } = await target.client.storage.from(target.bucket).upload(key, data, { contentType: mime, upsert });
    if (error) throw new Error(`${key}: ${error.message}`);
    return;
  }
  const full = path.join(target.dir, key);
  await fs.mkdir(path.dirname(full), { recursive: true });
  await fs.writeFile(full, data, upsert ? undefined : { flag: "wx" });
}

export async function getObject(target, key) {
  if (target.kind === "supabase") {
    const { data, error } = await target.client.storage.from(target.bucket).download(key);
    if (error) throw new Error(`${key}: ${error.message}`);
    return Buffer.from(await data.arrayBuffer());
  }
  return fs.readFile(path.join(target.dir, key));
}

/** Bucket-dakı bütün obyektlərin açarları (rekursiv, səhifələnmiş). */
export async function listKeys(target, prefix = "") {
  if (target.kind !== "supabase") throw new Error("listKeys yalnız Supabase Storage üçündür");
  const keys = [];
  const walk = async (dir) => {
    for (let offset = 0; ; offset += 1000) {
      const { data, error } = await target.client.storage.from(target.bucket).list(dir, { limit: 1000, offset });
      if (error) throw new Error(`${dir || "/"}: ${error.message}`);
      for (const item of data) {
        const full = dir ? `${dir}/${item.name}` : item.name;
        if (item.id) keys.push(full); // fayl
        else await walk(full); // qovluq
      }
      if (data.length < 1000) break;
    }
  };
  await walk(prefix.replace(/\/$/, ""));
  return keys;
}
