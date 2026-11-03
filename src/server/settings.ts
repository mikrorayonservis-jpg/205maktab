/** Sayt parametrləri (açar-dəyər). Defolt dəyərlər məktəbin rəsmi məlumatlarına əsaslanır. */
import "server-only";
import { cache } from "react";
import { db } from "@/lib/db";

export const SETTING_DEFS = {
  school_name: { label: "Məktəbin tam rəsmi adı", default: "Binəqədi rayonu Rövşən İmanov adına 205 nömrəli tam orta ümumtəhsil məktəbi", multiline: false },
  school_short_name: { label: "Qısa ad", default: "205 nömrəli məktəb", multiline: false },
  hero_title: { label: "Ana səhifə — başlıq", default: "Bilik, dəyər və vətənpərvərlik — 1930-cu ildən bəri", multiline: false },
  hero_text: {
    label: "Ana səhifə — giriş mətni",
    default: "Məktəbimiz Azərbaycanın Milli Qəhrəmanı Rövşən İmanovun adını daşıyır. 22 sentyabr 2021-ci ildə istifadəyə verilmiş iki korpuslu yeni binada 55 sinif otağı, fənn laboratoriyaları, STEAM və rəqəmsal bacarıqlar kabinetləri fəaliyyət göstərir.",
    multiline: true,
  },
  founded_year: { label: "Yaranma ili", default: "1930", multiline: false },
  // Göstəricilər: bakimektebleri.edu.az/205 "Haqqımızda" (2026-2027-ci tədris ili; 03.11.2026 yoxlanılıb)
  stat_year: { label: "Göstəricilərin tədris ili", default: "2026-2027", multiline: false },
  stat_students: { label: "Şagird sayı", default: "1358", multiline: false },
  stat_teachers: { label: "Müəllim sayı", default: "83", multiline: false },
  stat_classrooms: { label: "Sinif otağı", default: "55", multiline: false },
  result_year: { label: "Buraxılış nəticələri — tədris ili", default: "2025-2026", multiline: false },
  result_graduates: { label: "XI sinif məzunlarının sayı", default: "142", multiline: false },
  result_admitted: { label: "Ali məktəbə qəbul olanlar", default: "63", multiline: false },
  result_600: { label: "600-dən yuxarı bal toplayanlar", default: "5", multiline: false },
  stat_capacity: { label: "Layihə tutumu (şagird)", default: "960", multiline: false },
  address: { label: "Ünvan", default: "Bakı şəhəri, Binəqədi rayonu, II Mədən, korpus 93", multiline: false },
  phone: { label: "Telefon (ictimai)", default: "411-19-98", multiline: false },
  email: { label: "E-poçt (ictimai)", default: "205mekteb@baku.edu.gov.az", multiline: false },
  working_hours: { label: "İş rejimi", default: "5 günlük iş həftəsi, 2 növbə", multiline: false },
  map_embed_url: { label: "Xəritə keçidi (Google Maps / OpenStreetMap paylaşım URL)", default: "", multiline: false },
  social_facebook: { label: "Facebook", default: "", multiline: false },
  social_instagram: { label: "Instagram", default: "", multiline: false },
  social_youtube: { label: "YouTube", default: "", multiline: false },
  seo_default_description: {
    label: "Defolt SEO təsviri",
    default: "Rövşən İmanov adına 205 nömrəli tam orta ümumtəhsil məktəbinin rəsmi saytı: xəbərlər, tədbirlər, sənədlər və elektron jurnal.",
    multiline: true,
  },
  newspaper_name: { label: "Məktəb qəzetinin adı", default: "Yeni Dövr 205", multiline: false },
  official_journal_url: { label: "Rəsmi Elektron Jurnal — giriş ünvanı (yalnız https, *.edu.az / *.gov.az)", default: "https://jurnal.edu.az/login", multiline: false },
  official_digital_teacher_url: { label: "Rəqəmsal məktəb — müəllim girişi", default: "https://digital.edu.az/auth/digital/login/teacher", multiline: false },
  official_digital_director_url: { label: "Rəqəmsal məktəb — direktor girişi", default: "https://digital.edu.az/auth/digital/login/director", multiline: false },
  official_support_email: { label: "Rəsmi platforma texniki dəstək e-poçtu", default: "reqemsal@tsii.edu.az", multiline: false },
} as const;

export type SettingKey = keyof typeof SETTING_DEFS;
export type Settings = Record<SettingKey, string>;

export const getSettings = cache(async (): Promise<Settings> => {
  const out = Object.fromEntries(Object.entries(SETTING_DEFS).map(([k, v]) => [k, v.default])) as Settings;
  try {
    const rows = await db.query<{ setting_key: string; setting_value: string | null }>("SELECT setting_key, setting_value FROM site_settings");
    for (const r of rows) {
      if (r.setting_key in SETTING_DEFS && r.setting_value !== null) (out as Record<string, string>)[r.setting_key] = r.setting_value;
    }
  } catch (err) {
    console.error("[settings]", err);
  }
  return out;
});

export async function saveSettings(values: Partial<Settings>, userId: number) {
  for (const [key, value] of Object.entries(values)) {
    if (!(key in SETTING_DEFS)) continue;
    await db.execute(
      `INSERT INTO site_settings (setting_key, setting_value, description_az, updated_by) VALUES (?, ?, ?, ?)
       ON CONFLICT (setting_key) DO UPDATE SET setting_value = EXCLUDED.setting_value, updated_by = EXCLUDED.updated_by`,
      [key, value ?? "", SETTING_DEFS[key as SettingKey].label, userId]
    );
  }
}

export const getPage = cache(async (slug: string) => {
  return db.queryOne<{ slug: string; title_az: string; content_md: string; updated_at: string }>(
    "SELECT slug, title_az, content_md, updated_at FROM pages WHERE slug = ?",
    [slug]
  );
});

export const PAGE_SLUGS: Record<string, string> = {
  about: "Məktəb haqqında (ümumi)",
  history: "Tarix",
  mission: "Missiya və dəyərlər",
  strategy: "İnkişaf strategiyası",
  directions: "Təhsil istiqamətləri",
  infrastructure: "İnfrastruktur",
  traditions: "Ənənələr",
  privacy: "Məxfilik siyasəti",
  terms: "İstifadə qaydaları",
};
