// "Yeni Dövr 205" qəzetinin materiallarını xəbər redaksiyasına idxal edir.
// Məqalələr "Yoxlamada" (pending) statusunda yaradılır, "şagird təsviri var" kimi işarələnir və
// valideyn razılığı təsdiqlənmədən DƏRC EDİLMİR. Şəkillər WebP-yə çevrilir, EXIF silinir.
// İstifadə: npm run import:newspaper -- --author=admin@mekteb.edu.az
import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import sharp from "sharp";
import { loadEnv, connect, ROOT } from "./lib/env.mjs";
import { putObject, storageTarget } from "./lib/storage.mjs";

loadEnv();
const authorArg = process.argv.find((a) => a.startsWith("--author="))?.split("=")[1];
const STORAGE = storageTarget();

const ARTICLES = [
  {
    slug: "zererli-informasiya-ve-tehlukeli-oyunlardan-ozumuzu-qoruyaq",
    title: "“Zərərli informasiya və təhlükəli oyunlardan özümüzü qoruyaq” mövzusunda dərslər keçirilib",
    category: "sosial-layiheler",
    summary: "Şagirdlər arasında internet təhlükəsizliyi və rəqəmsal savadlılığın artırılması məqsədilə maarifləndirici dərslər təşkil olunub.",
    images: [["zerersiz-sinif1.jpg", "Maarifləndirici dərsdən görüntü"], ["zerersiz-sinif2.jpg", "Digər sinifdə keçirilən dərsdən görüntü"]],
    content: `Rövşən İmanov adına 205 nömrəli tam orta ümumtəhsil məktəbində şagirdlər arasında internet təhlükəsizliyi və rəqəmsal savadlılığın artırılması məqsədilə “Zərərli informasiya və təhlükəli oyunlardan özümüzü qoruyaq” mövzusunda bir sıra maarifləndirici dərslər keçirilmişdir.

Tədbirlər Bullinqlə Mübarizə Şurası və Sosial-Psixoloji Dəstək Komissiyasının təşəbbüsü ilə müxtəlif siniflərdə təşkil olunmuş, şagirdlərə internetdə rastlaşa biləcəkləri zərərli məzmun, şübhəli linklər və təhlükəli onlayn oyunların mümkün riskləri barədə ətraflı məlumat verilmişdir.

Dərslər zamanı şagirdlərə naməlum şəxslərlə ünsiyyətdə ehtiyatlı olmaq, şəxsi məlumatları paylaşmamaq və şübhəli hallarda dərhal valideynlərinə və ya müəllimlərinə müraciət etmək tövsiyə olunmuşdur. Eyni zamanda kiberbullinqin əlamətləri və ona qarşı necə mübarizə aparmaq barədə də izahat verilmişdir.

Tədbirin sonunda şagirdlər arasında fikir mübadiləsi aparılmış, mövzu ilə bağlı suallar cavablandırılmışdır. Məktəb rəhbərliyi bu kimi maarifləndirici tədbirlərin davamlı xarakter daşımasının vacibliyini vurğulamışdır.`,
  },
  {
    slug: "narkotiklere-yox-deyirik-maariflendirici-tedbir",
    title: "“Narkotiklərə yox deyirik!” mövzusunda maarifləndirici tədbir keçirilib",
    category: "tedbirler",
    summary: "Tədbirdə polis əməkdaşları, pedaqoji kollektiv, valideynlər və şagirdlər iştirak edib; şagirdlər maarifləndirici tamaşa nümayiş etdiriblər.",
    images: [["narko-tamasa1.jpg", "Tamaşa səhnəsindən görüntü"], ["narko-tamasa2.jpg", "Tamaşadan görüntü"], ["narko-audience.jpg", "Tədbirin iştirakçıları"]],
    content: `Rövşən İmanov adına 205 nömrəli tam orta ümumtəhsil məktəbində “Narkotiklərə yox deyirik!” mövzusunda geniş maarifləndirici tədbir keçirilmişdir.

Tədbirin əsas məqsədi yeniyetmə və gənclər arasında narkomaniyanın fəsadları barədə maarifləndirmə işinin gücləndirilməsi, onların zərərli vərdişlərdən uzaq tutulması və sağlam həyat tərzinin təbliğ olunmasıdır.

Tədbirdə polis əməkdaşları, məktəbin pedaqoji kollektivi, valideynlər və şagirdlər iştirak etmişlər. Çıxışlar zamanı narkomaniyanın insan sağlamlığına, ailəyə və cəmiyyətə vurduğu ciddi zərərlər barədə məlumat verilmişdir.

Tədbirin əsas hissəsində məktəbin şagirdləri narkomaniyanın insan həyatına və ailəyə vurduğu ağır fəsadları əks etdirən təsirli maarifləndirici tamaşa nümayiş etdirmişlər.

> Unutmayaq ki, sağlam gələcək düzgün seçimdən başlayır!`,
  },
  {
    slug: "1-iyun-usaqlarin-beynelxalq-mudafiesi-gunu",
    title: "1 İyun — Uşaqların Beynəlxalq Müdafiəsi Günü münasibətilə tədbir keçirildi",
    category: "tedbirler",
    summary: "Bayram tədbirində rəqs nömrələri, səhnəciklər və “Tıq-Tıq xanım” tamaşası təqdim olundu.",
    date: "2026-06-01 11:00:00",
    images: [["1iyun.jpg", "1 İyun tədbirindən görüntü"], ["1uyun.jpg", "Şagird çıxışları"], ["usaglar1uyun.jpg", "Uşaqlar bayramda"], ["iyunsekil.jpg", "Rəngarəng tədbir anı"]],
    content: `1 İyun — Uşaqların Beynəlxalq Müdafiəsi Günü münasibətilə məktəbimizdə rəngarəng və yaddaqalan tədbir keçirildi.

Tədbir Azərbaycan Respublikasının Dövlət Himninin səsləndirilməsi ilə başladı. Daha sonra şagirdlərimizin hazırladığı rəqs nömrələri və səhnəciklər bayram ab-havasını daha da yüksəltdi.

Günün ən maraqlı məqamlarından biri şagirdlərin təqdim etdiyi “Tıq-Tıq xanım” tamaşası oldu. Tamaşa izləyicilər tərəfindən böyük maraqla qarşılandı.

Tədbirin sonunda məktəbin direktoru Əliheydər Əlifli çıxış edərək bütün uşaqları bayram münasibətilə təbrik etdi, onlara uğurlar və xoşbəxt gələcək arzuladı.

Tədbiri İctimai İşlərin Təşkili Komissiyası təşkil etmişdir.`,
  },
  {
    slug: "bullinqle-mubarize-surasi-yaradildi",
    title: "Bullinqlə Mübarizə Şurası — Sosial-Psixoloji Dəstək Komissiyası yaradıldı",
    category: "mekteb-xeberleri",
    summary: "Məktəbdə sağlam, təhlükəsiz və qarşılıqlı hörmətə əsaslanan mühitin qurulması istiqamətində 6 fəal şagirddən ibarət komissiya yaradılıb.",
    date: "2026-05-09 10:00:00",
    images: [["bms-foto1.jpg", "Komissiya üzvləri"], ["bms-foto2.jpg", "Komissiya üzvləri psixoloqla görüşdə"]],
    content: `Məktəbdə şagirdlər arasında sağlam, təhlükəsiz və qarşılıqlı hörmətə əsaslanan münasibətlərin formalaşdırılması, bullinq hallarının qarşısının alınması və şagirdlərin sosial-psixoloji rifahının dəstəklənməsi məqsədilə 6 nəfər fəal şagirddən ibarət Bullinqlə Mübarizə Şurası və Sosial-Psixoloji Dəstək Komissiyası yaradılmışdır.

## Əsas fəaliyyət istiqamətləri

- Bullinqin mahiyyəti və nəticələri barədə maarifləndirici söhbətlər aparmaq;
- Bullinq, təhqir, ayrı-seçkilik və kiberbullinqin qarşısının alınmasına yönəlmiş tədbirlərdə iştirak etmək;
- Həmyaşıdları arasında mehribanlıq, hörmət, tolerantlıq və əməkdaşlıq mühitinə dəstək olmaq;
- Çətinliklə üzləşən şagirdləri dinləmək və zəruri hallarda psixoloqa, sinif rəhbərinə və rəhbərliyə yönləndirmək;
- İnternetdən təhlükəsiz istifadə barədə həmyaşıdları maarifləndirmək.

Komissiyanın fəaliyyətinə məktəb psixoloqları Aytən Məmmədova və Zülfiyyə Məsimova metodiki dəstək göstərir. Komissiya məktəb direktoru Əliheydər Əliflinin 09.05.2026 tarixli qərarı ilə yaradılmışdır.

> Unutmayaq: zarafat başqasına zərər verirsə, bu artıq zarafat deyil!`,
  },
  {
    slug: "narkomaniyaya-yox-deyek-resm-musabiqesi",
    title: "“Narkomaniyaya yox deyək” adlı rəsm müsabiqəsi keçirilib",
    category: "medeniyyet",
    summary: "Sağlam həyat tərzinin təbliği məqsədilə təşkil olunan rəsm sərgisində fərqlənən şagirdlər diplomla təltif olunub.",
    images: [["resm-acilis.jpg", "Sərginin açılışı"], ["resm-sergi.jpg", "Rəsm sərgisi"], ["resm-baxis.jpg", "Münsiflər baxışda"]],
    content: `Məktəbdə sağlam həyat tərzinin təbliği, zərərli vərdişlərə qarşı maarifləndirmə işinin gücləndirilməsi və narkomaniyanın cəmiyyətə vurduğu zərərlər barədə şagirdlərin məlumatlılığının artırılması məqsədilə “Narkomaniyaya yox deyək” mövzusunda rəsm sərgisi təşkil edilmişdir.

Sərgidə şagirdlər narkomaniyanın mənfi təsirlərini, sağlam həyat tərzinin üstünlüklərini və düzgün həyat seçiminin əhəmiyyətini əks etdirən rəsmlər təqdim etmişlər.

Rəsm işləri məktəb rəhbərliyi və təsviri incəsənət müəllimlərindən ibarət komissiya tərəfindən mövzuya uyğunluq, yaradıcılıq səviyyəsi, ideyanın ifadəsi və bədii tərtibat meyarları əsasında qiymətləndirilmişdir.

Münsiflər heyətinin qərarına əsasən ən yaxşı rəsm işlərinin müəllifləri məktəbin direktoru Əliheydər Əlifli tərəfindən “Diplom”la mükafatlandırılmışdır.`,
  },
];

async function storeImage(conn, file, ownerId) {
  const src = path.join(ROOT, file);
  const buf = await fs.readFile(src);
  const out = await sharp(buf).rotate().resize({ width: 2000, withoutEnlargement: true }).webp({ quality: 82 }).toBuffer({ resolveWithObject: true });
  const d = new Date();
  const key = `public/${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${crypto.randomBytes(16).toString("hex")}.webp`;
  await putObject(STORAGE, key, out.data, "image/webp");
  const [res] = await conn.query(
    "INSERT INTO files (storage_key, original_name, mime_type, size_bytes, width, height, visibility, purpose, owner_user_id) VALUES (?, ?, 'image/webp', ?, ?, ?, 'public', 'gallery', ?)",
    [key, file, out.data.length, out.info.width, out.info.height, ownerId]
  );
  return { id: res.insertId, url: `/media/${key.replace(/^public\//, "")}` };
}

async function run() {
  const conn = await connect();
  const [[author]] = authorArg
    ? await conn.query("SELECT id FROM users WHERE email = ?", [authorArg.toLowerCase()])
    : await conn.query("SELECT u.id FROM users u JOIN user_roles ur ON ur.user_id = u.id JOIN roles r ON r.id = ur.role_id WHERE r.code = 'super_admin' ORDER BY u.id LIMIT 1");
  if (!author) throw new Error("Müəllif tapılmadı. Əvvəlcə `npm run admin:create` icra edin və ya --author=e-poçt göstərin.");
  let created = 0;
  for (const a of ARTICLES) {
    const [[exists]] = await conn.query("SELECT id FROM news WHERE slug = ?", [a.slug]);
    if (exists) continue;
    const [[cat]] = await conn.query("SELECT id FROM news_categories WHERE slug = ?", [a.category]);
    const [g] = await conn.query(
      "INSERT INTO galleries (title_az, slug, category_az, event_date, contains_minors, consent_confirmed, is_published, created_by) VALUES (?, ?, 'Tədbirlər', ?, 1, 0, 0, ?)",
      [a.title.replace(/[“”]/g, ""), a.slug, a.date ? a.date.slice(0, 10) : null, author.id]
    );
    let cover = null;
    let order = 0;
    for (const [file, alt] of a.images) {
      try {
        const f = await storeImage(conn, file, author.id);
        cover = cover ?? f.url;
        await conn.query("INSERT INTO gallery_images (gallery_id, image_url, file_id, alt_text, caption_az, sort_order) VALUES (?, ?, ?, ?, ?, ?)", [g.insertId, f.url, f.id, alt, alt, ++order]);
      } catch (e) {
        console.warn(`  [xəbərdarlıq] ${file} oxunmadı: ${e.message}`);
      }
    }
    await conn.query("UPDATE galleries SET cover_image = ? WHERE id = ?", [cover, g.insertId]);
    const [n] = await conn.query(
      `INSERT INTO news (title_az, slug, summary_az, content_az, cover_image, cover_alt_az, category_id, byline_az, created_by, status, contains_minors, consent_confirmed, submitted_at, gallery_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'Yeni Dövr 205 redaksiyası', ?, 'pending', 1, 0, NOW(), ?)`,
      [a.title, a.slug, a.summary, a.content, cover, a.images[0]?.[1] ?? null, cat?.id ?? null, author.id, g.insertId]
    );
    await conn.query("INSERT INTO news_revisions (news_id, action, status_to, title_az, change_reason, changed_by) VALUES (?, 'create', 'pending', ?, 'Qəzetdən idxal', ?)", [n.insertId, a.title, author.id]);
    created++;
    console.log(`  + ${a.title}`);
  }
  console.log(`[import] ${created} məqalə "Yoxlamada" statusunda əlavə edildi. Dərcdən əvvəl redaksiya valideyn razılığını təsdiqləməlidir.`);
  await conn.end();
}

run().catch((e) => { console.error("[import] Xəta:", e.message); process.exit(1); });
