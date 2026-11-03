// Rəsmi səhifədən (bakimektebleri.edu.az/205) xəbər və fotoları redaksiyaya idxal edir.
//
// Təhlükəsizlik və dəqiqlik qaydaları:
//  - Defolt rejim YOXLAMADIR: heç nə yazılmır, yalnız tapılan materiallar göstərilir. Yazmaq üçün: --apply
//  - Hər xəbər "Yoxlamada" (pending) statusunda, "şagird təsviri var" (contains_minors=1) və
//    valideyn razılığı TƏSDİQLƏNMƏMİŞ kimi yaradılır — redaksiya yoxlamadan heç nə dərc olunmur.
//  - Albomlar dərc edilməmiş (is_published=0) yaradılır.
//  - Rəsmi səhifədə xəbərin öz tarixi göstərilmir. Tarix bu ardıcıllıqla təyin olunur:
//      1) səhifənin "Xəbər lenti"ndəki tarix (yalnız son xəbərlər üçün) — dəqiq;
//      2) DATE_OVERRIDES — əl ilə yoxlanmış tarix;
//      3) ilk fotonun yüklənmə vaxtı (fayl adındakı Unix vaxtı) — TƏXMİNİ, review_note-da qeyd olunur.
//    Redaktor dərcdən əvvəl tarixi yoxlamalıdır.
//  - Mətnə mənbə keçidi əlavə olunur. Təkrar icra təhlükəsizdir: eyni xəbər (slug) ikinci dəfə yaradılmır.
//
// İstifadə:
//   npm run import:official                       (yoxlama, cari il)
//   npm run import:official -- --year=2026 --apply
//   Seçimlər: --limit=N  --max-images=12  --no-images  --author=e-poçt  --leadership (rəhbərlik siyahısını da idxal et)
import crypto from "node:crypto";
import sharp from "sharp";
import { loadEnv, connect } from "./lib/env.mjs";
import { putObject, storageTarget } from "./lib/storage.mjs";

loadEnv();
const arg = (name) => process.argv.find((a) => a.startsWith(`--${name}=`))?.split("=").slice(1).join("=");
const flag = (name) => process.argv.includes(`--${name}`);
const APPLY = flag("apply");
const YEAR = Number(arg("year") || new Date().getFullYear());
const LIMIT = Number(arg("limit") || 1000);
const MAX_IMAGES = Number(arg("max-images") || 12);
const NO_IMAGES = flag("no-images");
const BASE = "https://bakimektebleri.edu.az/205/az";
const UA = { "User-Agent": "205-mekteb-import/1.0 (+school site migration)" };

/** Əl ilə yoxlanmış tarixlər (rəsmi xəbər ID → tarix). */
const DATE_OVERRIDES = {
  // "Bahar təravətli- Son Zəng": 13.06.2026 (məktəb tərəfindən bildirilib; ID ardıcıllığına uyğundur — 10.06.2026 xəbərindən sonra)
  328458: { date: "2026-06-13", note: "məktəb tərəfindən bildirilmiş tarix" },
};

/** Rəsmi səhifədəki "Rəhbərlik" bölməsi (03.11.2026 yoxlanılıb). Bioqrafiyalar idxal edilmir. */
const LEADERSHIP = [
  ["Əliheydər Əlifli Elman", "Direktor", 1],
  ["Aynur Ələsgərova Cavid", "Təlim-tərbiyə işləri üzrə direktor müavini", 0],
  ["Vüsalə Rəcəbova Fərhad", "Məktəbdənkənar və sinifdənxaric tərbiyə işi üzrə təşkilatçı", 0],
  ["Zilfi Zilfiyev Baxış", "Direktorun təsərrüfat işləri üzrə müavini", 0],
  ["Emin Əliyev Telman", "Çağırışaqədərki hazırlıq rəhbəri", 0],
  ["Zülfiyyə Məsimova Qənbər", "Məktəb psixoloqu", 0],
  ["Aytən Məmmədova Səadət", "Məktəb psixoloqu", 0],
  ["İlahə Babayeva Səadətdin", "Kitabxana müdiri", 0],
  ["Rüxsarə Qocayeva Qahir", "Uşaq birliyi rəhbəri", 0],
];

const MAP = { ə: "e", Ə: "e", ı: "i", I: "i", İ: "i", ö: "o", Ö: "o", ü: "u", Ü: "u", ş: "s", Ş: "s", ç: "c", Ç: "c", ğ: "g", Ğ: "g" };
function slugify(input, max = 100) {
  const s = [...input].map((c) => MAP[c] ?? c).join("").normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return s.slice(0, max).replace(/-+$/g, "") || "xeber";
}

const ENTITIES = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", laquo: "«", raquo: "»", ndash: "–", mdash: "—", hellip: "…", ldquo: "“", rdquo: "”", lsquo: "‘", rsquo: "’" };
const LATIN1 = { uuml: "ü", Uuml: "Ü", ouml: "ö", Ouml: "Ö", ccedil: "ç", Ccedil: "Ç", auml: "ä", Auml: "Ä", eacute: "é" };
function decode(s) {
  return s
    .replace(/&#(\d+);/g, (_m, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_m, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&([a-z]+);/gi, (m, n) => ENTITIES[n] ?? LATIN1[n] ?? m);
}
const text = (html) => decode(html.replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, "")).replace(/[ \t]+/g, " ").trim();

async function get(url, binary = false) {
  for (let i = 0; i < 3; i++) {
    try {
      const r = await fetch(url, { headers: UA, signal: AbortSignal.timeout(30000) });
      if (r.status === 404) return null;
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return binary ? Buffer.from(await r.arrayBuffer()) : await r.text();
    } catch (e) {
      if (i === 2) throw new Error(`${url}: ${e.message}`);
      await new Promise((res) => setTimeout(res, 1500 * (i + 1)));
    }
  }
}

function bakuDate(unixSeconds) {
  return new Date(unixSeconds * 1000 + 4 * 3600 * 1000).toISOString().slice(0, 10);
}

/** Xəbər səhifəsini təhlil edir: başlıq, abzaslar, şəkillər, lentdəki tarixlər. */
export function parseArticle(html) {
  const title = text(html.match(/<h2 class="news-title">([\s\S]*?)<\/h2>/)?.[1] ?? "");
  const bodyStart = html.indexOf('<div class="news-p">');
  const bodyEnd = html.indexOf("<!--here ends new-content-->", bodyStart);
  const body = bodyStart >= 0 ? html.slice(bodyStart, bodyEnd > 0 ? bodyEnd : undefined) : "";
  const paragraphs = [...body.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/g)].map((m) => text(m[1])).filter((p) => p.length > 1);
  const images = [...new Set([...body.matchAll(/href="(https:\/\/bakimektebleri\.edu\.az\/uploads\/news_gallery\/[^"]+\.(?:jpe?g|png|webp))"/gi)].map((m) => m[1]))];
  const feed = new Map();
  for (const m of html.matchAll(/news\/read\/(\d+)">[\s\S]*?<span class="data">(\d{2})\.(\d{2})\.(\d{4})<\/span>/g)) feed.set(Number(m[1]), `${m[4]}-${m[3]}-${m[2]}`);
  return { title, paragraphs, images, feed };
}

function resolveDate(id, images, feedDates) {
  if (feedDates.has(id)) return { date: feedDates.get(id), source: "rəsmi xəbər lenti", exact: true };
  if (DATE_OVERRIDES[id]) return { date: DATE_OVERRIDES[id].date, source: DATE_OVERRIDES[id].note, exact: true };
  const ts = images.map((u) => Number(u.match(/news_gallery\/(\d{10})/)?.[1])).filter(Boolean);
  if (ts.length) return { date: bakuDate(Math.min(...ts)), source: "fotonun yüklənmə vaxtı (təxmini)", exact: false };
  return null;
}

async function collect() {
  const out = [];
  const feedDates = new Map();
  let olderStreak = 0;
  let lastDate = null;
  for (let page = 1; page <= 60 && out.length < LIMIT && olderStreak < 12; page++) {
    const html = await get(`${BASE}/news/archive/${page}`);
    if (!html) break;
    const links = [...html.matchAll(/<h2><a href="(https:\/\/bakimektebleri\.edu\.az\/205\/az\/news\/read\/(\d+))">([\s\S]*?)<\/a><\/h2>/g)];
    if (!links.length) break;
    for (const [, url, idStr] of links) {
      if (out.length >= LIMIT || olderStreak >= 12) break;
      const id = Number(idStr);
      const doc = await get(url);
      if (!doc) continue;
      const a = parseArticle(doc);
      for (const [k, v] of a.feed) feedDates.set(k, v);
      let d = resolveDate(id, a.images, feedDates);
      // Tarixi təyin oluna bilməyənlər: sıralamada əvvəlki (daha yeni) xəbərin tarixi, təxmini kimi
      if (!d && lastDate) d = { date: lastDate, source: "qonşu xəbərin tarixi (təxmini)", exact: false };
      if (!d) continue;
      lastDate = d.date;
      const y = Number(d.date.slice(0, 4));
      if (y > YEAR) continue;
      if (y < YEAR) {
        olderStreak++;
        continue;
      }
      olderStreak = 0;
      out.push({ id, url, title: a.title, paragraphs: a.paragraphs, images: a.images, ...d });
    }
  }
  return out;
}

async function storeImage(conn, store, url, ownerId) {
  const buf = await get(url, true);
  if (!buf) throw new Error("tapılmadı");
  const img = await sharp(buf, { failOn: "error", limitInputPixels: 50_000_000 }).rotate().resize({ width: 1600, withoutEnlargement: true }).webp({ quality: 80 }).toBuffer({ resolveWithObject: true });
  const d = new Date();
  const key = `public/${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${crypto.randomBytes(16).toString("hex")}.webp`;
  await putObject(store, key, img.data, "image/webp");
  const [res] = await conn.query(
    "INSERT INTO files (storage_key, original_name, mime_type, size_bytes, width, height, visibility, purpose, owner_user_id) VALUES (?, ?, 'image/webp', ?, ?, ?, 'public', 'gallery', ?)",
    [key, url.split("/").pop().slice(0, 200), img.data.length, img.info.width, img.info.height, ownerId]
  );
  return { id: res.insertId, url: `/media/${key.replace(/^public\//, "")}` };
}

async function importLeadership(conn) {
  const [[{ n }]] = await conn.query("SELECT COUNT(*) AS n FROM leadership");
  if (n > 0) {
    console.log(`[rəhbərlik] Cədvəldə artıq ${n} nəfər var — dəyişdirilmədi (admin paneldən redaktə edin).`);
    return;
  }
  for (const [i, [name, position, isDirector]] of LEADERSHIP.entries()) {
    await conn.query("INSERT INTO leadership (full_name, position_az, is_director, sort_order, is_published) VALUES (?, ?, ?, ?, 1)", [name, position, isDirector, i + 1]);
  }
  console.log(`[rəhbərlik] ${LEADERSHIP.length} nəfər əlavə edildi (mənbə: ${BASE}/leadership/).`);
}

async function run() {
  console.log(`Rəsmi səhifə: ${BASE} · il: ${YEAR} · rejim: ${APPLY ? "YAZMA" : "yoxlama (heç nə yazılmır)"}`);
  const items = await collect();
  for (const it of items) console.log(`  ${it.date}${it.exact ? " " : "~"} #${it.id}  ${it.images.length} foto  ${it.title}`);
  console.log(`\n${items.length} xəbər tapıldı (~ = təxmini tarix, ${items.filter((i) => !i.exact).length} ədəd). Foto: ${items.reduce((s, i) => s + Math.min(i.images.length, MAX_IMAGES), 0)} (xəbər başına ən çox ${MAX_IMAGES}).`);
  if (!APPLY) {
    console.log("Yoxlama rejimi — heç nə yazılmadı. Yazmaq üçün: npm run import:official -- --apply");
    return;
  }

  const conn = await connect();
  const store = storageTarget();
  try {
    const authorArg = arg("author");
    const [[author]] = authorArg
      ? await conn.query("SELECT id FROM users WHERE email = ?", [authorArg.toLowerCase()])
      : await conn.query("SELECT u.id FROM users u JOIN user_roles ur ON ur.user_id = u.id JOIN roles r ON r.id = ur.role_id WHERE r.code = 'super_admin' ORDER BY u.id LIMIT 1");
    if (!author) throw new Error("Müəllif tapılmadı. Əvvəlcə administrator hesabı yaradın və ya --author=e-poçt göstərin.");
    if (flag("leadership")) await importLeadership(conn);
    const [[cat]] = await conn.query("SELECT id FROM news_categories WHERE slug = 'mekteb-xeberleri'");
    console.log(`Fayllar: ${store.label}`);

    let created = 0;
    for (const it of items) {
      const slug = `${slugify(it.title, 90)}-r${it.id}`;
      const [[exists]] = await conn.query("SELECT id FROM news WHERE slug = ?", [slug]);
      if (exists) continue;
      const note = `Rəsmi səhifədən idxal edilib: ${it.url}\nTarix mənbəyi: ${it.source}.${it.exact ? "" : " DƏRCDƏN ƏVVƏL TARİXİ YOXLAYIN."}\nFotolarda şagirdlər ola bilər: valideyn razılığını təsdiqləmədən dərc etməyin.`;
      const content = `${it.paragraphs.join("\n\n")}\n\n---\n\nMənbə: [Bakı məktəbləri portalı — 205 nömrəli məktəb](${it.url})`;
      const summary = (it.paragraphs[0] || "").slice(0, 300);

      await conn.exec("BEGIN");
      try {
        let galleryId = null;
        let cover = null;
        if (!NO_IMAGES && it.images.length) {
          const [g] = await conn.query(
            "INSERT INTO galleries (title_az, slug, category_az, event_date, contains_minors, consent_confirmed, is_published, created_by) VALUES (?, ?, 'Məktəb həyatı', ?, 1, 0, 0, ?)",
            [it.title.slice(0, 255), slug, it.date, author.id]
          );
          galleryId = g.insertId;
          let order = 0;
          for (const url of it.images.slice(0, MAX_IMAGES)) {
            try {
              const f = await storeImage(conn, store, url, author.id);
              cover = cover ?? f.url;
              await conn.query("INSERT INTO gallery_images (gallery_id, image_url, file_id, alt_text, sort_order) VALUES (?, ?, ?, ?, ?)", [galleryId, f.url, f.id, it.title.slice(0, 255), ++order]);
            } catch (e) {
              console.warn(`    [xəbərdarlıq] foto alınmadı (${url}): ${e.message}`);
            }
          }
          if (cover) await conn.query("UPDATE galleries SET cover_image = ? WHERE id = ?", [cover, galleryId]);
        }
        const [n] = await conn.query(
          `INSERT INTO news (title_az, slug, summary_az, content_az, cover_image, cover_alt_az, category_id, byline_az, created_by, status,
                             contains_minors, consent_confirmed, review_note, submitted_at, published_at, gallery_id)
           VALUES (?, ?, ?, ?, ?, ?, ?, '205 nömrəli məktəb', ?, 'pending', 1, 0, ?, NOW(), ?, ?)`,
          [it.title.slice(0, 300), slug, summary, content, cover, cover ? it.title.slice(0, 255) : null, cat?.id ?? null, author.id, note, `${it.date} 12:00:00+04:00`, galleryId]
        );
        await conn.query("INSERT INTO news_revisions (news_id, action, status_to, title_az, change_reason, changed_by) VALUES (?, 'create', 'pending', ?, 'Rəsmi səhifədən idxal', ?)", [n.insertId, it.title.slice(0, 300), author.id]);
        await conn.exec("COMMIT");
        created++;
        console.log(`  + ${it.date} ${it.title}`);
      } catch (e) {
        await conn.exec("ROLLBACK");
        console.error(`  ✗ #${it.id} ${it.title}: ${e.message}`);
      }
    }
    console.log(`\n[import:official] ${created} xəbər "Yoxlamada" statusunda əlavə edildi. Redaksiya → Yoxlama növbəsi: tarixi və valideyn razılığını təsdiqləyib dərc edin.`);
  } finally {
    await conn.end();
  }
}

if (process.argv[1]?.endsWith("import-official.mjs")) {
  run().catch((e) => {
    console.error("[import:official] Xəta:", e.message);
    process.exit(1);
  });
}
