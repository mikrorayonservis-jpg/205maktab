// Məktəbin REAL ilkin məzmunu ("Yeni Dövr 205" qəzetindəki rəsmi məlumatlar əsasında).
// Mövcud məzmun üzərinə yazılmır (yalnız boş olan qeydlər əlavə edilir). Production üçün təhlükəsizdir.
// İstifadə: npm run seed:content
import { loadEnv, connect } from "./lib/env.mjs";

loadEnv();

const PAGES = {
  about: {
    title: "Ümumi məlumat",
    md: `Binəqədi rayonu Rövşən İmanov adına 205 nömrəli tam orta ümumtəhsil məktəbi **1930-cu ildən** fəaliyyət göstərir. Məktəb Azərbaycanın Milli Qəhrəmanı Rövşən İmanovun adını daşıyır.

Məktəb 5 günlük iş rejimi ilə 2 növbədə fəaliyyət göstərir. 2025-2026-cı tədris ilində məktəbdə təhsil alan 1425 şagirdin təlim-tərbiyəsi ilə 79 müəllim məşğul olur.`,
  },
  history: {
    title: "Tarix",
    md: `Məktəb 1930-cu ildə yaradılıb. Azərbaycan Respublikasının Prezidentinin 2019-cu il 15 yanvar tarixli Sərəncamı ilə təsdiq edilmiş “Bakı şəhərinin və onun qəsəbələrinin sosial-iqtisadi inkişafına dair Dövlət Proqramı”na əsasən məktəb binası sökülərək yenidən tikilib.

İki korpus və hər korpusda 4 mərtəbə olmaqla 960 şagird tutumlu yeni bina **22 sentyabr 2021-ci il** tarixində müəllim və şagirdlərin istifadəsinə verilib.`,
  },
  infrastructure: {
    title: "İnfrastruktur",
    md: `Təhsil ocağında aşağıdakılar mövcuddur:

- 56 sinif otağı
- Müasir tələblərə cavab verən fənn laboratoriyaları və fənn kabinetləri
- İnformatika, STEAM və rəqəmsal bacarıqlar kabinetləri
- Akt zalı və idman zalı
- İdman meydançası
- Bufet və tibb kabineti
- İnzibati heyət otaqları və hərbi kabinet

Məktəb lazımi avadanlıqlarla və kompüterlərlə təmin olunub.`,
  },
  directions: {
    title: "Təhsil istiqamətləri",
    md: `## STEAM və rəqəmsal bacarıqlar
Məktəbdə STEAM və Rəqəmsal bacarıqlar layihəsi üzrə dərslər keçirilir.

## Kiçik Akademiya
Kiçik Akademiya şagirdlərin elmi potensialını üzə çıxarmağa və tədqiqat bacarıqlarını inkişaf etdirməyə kömək edir. Şagirdlər müxtəlif fənlər üzrə araşdırmalar aparır, layihələr hazırlayır və təqdimatlar edirlər. Məqsəd elmi düşüncəli, yaradıcı və təşəbbüskar gənclər yetişdirməkdir.`,
  },
  traditions: {
    title: "Ənənələr və şagird özünüidarəsi",
    md: `Şagirdlər hər il müxtəlif müsabiqələr, fənn olimpiadaları, intellektual yarışlar, hərbi-idman və idman yarışlarında iştirak edirlər.

Məktəbdə şagirdlərdən ibarət komissiyalar fəaliyyət göstərir:

- Media və İnformasiya Komissiyası
- Təhlükəsizlik Nəzarət Komissiyası
- İctimai İşlərin Təşkili Komissiyası
- Bullinqlə Mübarizə Şurası — Sosial-Psixoloji Dəstək Komissiyası

Hər il 1 İyun — Uşaqların Beynəlxalq Müdafiəsi Günü, maarifləndirici tədbirlər və yaradıcılıq müsabiqələri keçirilir. Məktəbin “Yeni Dövr 205” qəzeti nəşr olunur.`,
  },
  privacy: {
    title: "Məxfilik siyasəti",
    md: `## Hansı məlumatları toplayırıq
Elektron jurnal üçün şagird, valideyn və əməkdaşların ad, soyad, e-poçt ünvanı, sinif, qiymət, davamiyyət və ev tapşırıqları haqqında məlumatlar saxlanılır.

## Məlumatlardan necə istifadə edirik
Məlumatlar yalnız təhsil prosesinin təşkili üçün istifadə olunur. Şagirdin nəticələrini yalnız şagirdin özü, ona bağlanmış valideyn, dərs deyən müəllimlər, sinif rəhbəri və səlahiyyətli məktəb rəhbərliyi görə bilər.

## Uşaqların təsvirləri
Yetkinlik yaşına çatmayan şagirdlərin foto və videoları yalnız valideyn razılığı olduqda dərc edilir.

## Təhlükəsizlik
Parollar geri qaytarılmayan şəkildə (Argon2id) saxlanılır, bütün dəyişikliklər audit jurnalında qeydə alınır.

## Müraciət
Məlumatlarınızla bağlı sorğular üçün məktəb rəhbərliyinə müraciət edin.`,
  },
  terms: {
    title: "İstifadə qaydaları",
    md: `- Hesab məlumatlarınızı başqası ilə paylaşmayın.
- Başqa şagird və ya ailənin məlumatlarını əldə etməyə cəhd qadağandır.
- Saytda yerləşdirilən materiallar məktəbin rəsmi mövqeyini əks etdirir; onların icazəsiz kommersiya məqsədilə istifadəsi qadağandır.
- Platformadan sui-istifadə hallarında hesab bloklana bilər.`,
  },
};

const ACHIEVEMENTS = [
  ["“Təhsildə İnkişaf və İnnovasiyalar üzrə Qrant Müsabiqəsi”nin qalibi", null, 1],
  ["“Ən yaxşı məktəb saytı” müsabiqəsinin qalibi", "2021-2022", 2],
  ["115 məzundan 55 nəfəri ali təhsil müəssisələrinə qəbul olunub; 3 məzun 600 baldan yuxarı nəticə göstərib", "2024-2025", 3],
];

const CATEGORIES = [
  ["Məktəb xəbərləri", "mekteb-xeberleri"],
  ["Rəsmi elanlar", "resmi-elanlar"],
  ["Tədbirlər", "tedbirler"],
  ["Olimpiadalar", "olimpiadalar"],
  ["Şagird nailiyyətləri", "sagird-nailiyyetleri"],
  ["Müəllim nailiyyətləri", "muellim-nailiyyetleri"],
  ["İdman", "idman"],
  ["Mədəniyyət", "medeniyyet"],
  ["Sosial layihələr", "sosial-layiheler"],
  ["Təhsil yenilikləri", "tehsil-yenilikleri"],
];

async function run() {
  const c = await connect();
  for (const [slug, p] of Object.entries(PAGES)) {
    await c.query("INSERT INTO pages (slug, title_az, content_md) VALUES (?, ?, ?) ON CONFLICT DO NOTHING", [slug, p.title, p.md]);
  }
  for (const [name, slug] of CATEGORIES) {
    await c.query("INSERT INTO news_categories (name_az, slug) VALUES (?, ?) ON CONFLICT DO NOTHING", [name, slug]);
  }
  const [[{ n: ach }]] = await c.query("SELECT COUNT(*) AS n FROM achievements");
  if (Number(ach) === 0) {
    for (const [title, year, order] of ACHIEVEMENTS) {
      await c.query("INSERT INTO achievements (title_az, year_label, sort_order) VALUES (?, ?, ?)", [title, year, order]);
    }
  }
  const [[{ n: lead }]] = await c.query("SELECT COUNT(*) AS n FROM leadership");
  if (Number(lead) === 0) {
    await c.query(
      "INSERT INTO leadership (full_name, position_az, is_director, sort_order) VALUES (?, ?, 1, 0)",
      ["Əliheydər Əlifli", "Məktəbin direktoru"]
    );
  }
  const [[{ n: links }]] = await c.query("SELECT COUNT(*) AS n FROM useful_links");
  if (Number(links) === 0) {
    await c.query("INSERT INTO useful_links (title_az, url, sort_order) VALUES (?, ?, 1)", ["Elm və Təhsil Nazirliyi", "https://edu.gov.az"]);
  }
  console.log("[seed:content] Real ilkin məzmun əlavə edildi (mövcud qeydlər dəyişdirilmədi).");
  await c.end();
}

run().catch((e) => { console.error("[seed:content] Xəta:", e.sqlMessage || e.message); process.exit(1); });
