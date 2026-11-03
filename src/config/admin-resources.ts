/**
 * Admin CMS resurs tərifləri (həm server, həm klient tərəfindən istifadə olunur).
 * Cədvəl və sütun adları YALNIZ buradan götürülür — istifadəçi girişindən heç vaxt SQL identifikatoru qurulmur.
 */
import type { Permission } from "@/lib/auth/permissions";

export type FieldType =
  | "text" | "textarea" | "markdown" | "number" | "date" | "datetime" | "time"
  | "select" | "boolean" | "image" | "file" | "email" | "url";

export type OptionSource = "subjects" | "classes" | "teachers" | "school_years" | "news_categories" | "galleries";

export interface FieldDef {
  name: string;
  label: string;
  type: FieldType;
  required?: boolean;
  max?: number;
  min?: number;
  options?: { value: string; label: string }[];
  source?: OptionSource;
  help?: string;
  list?: boolean;
  default?: string | number | boolean;
  /** Formada göstərilir, amma ictimai saytda heç vaxt göstərilmir */
  private?: boolean;
  /** Fayl sahəsi üçün yükləmə təyinatı */
  purpose?: string;
  /** Yalnız oxumaq üçün (cədvəldə göstərilir, formada yox) */
  readOnly?: boolean;
}

export interface ResourceDef {
  key: string;
  title: string;
  singular: string;
  table: string;
  permission: Permission;
  /** Yalnız oxuma (siyahı) üçün əlavə icazələr */
  viewPermissions?: Permission[];
  softDelete?: boolean;
  orderBy: string;
  search: string[];
  fields: FieldDef[];
  /** Avtomatik slug: bu sahədən yaradılır (slug sütunu varsa) */
  slugFrom?: string;
  createdByColumn?: string;
  filters?: string[];
  description?: string;
}

export const DOCUMENT_CATEGORY_OPTIONS = [
  { value: "nizamname", label: "Məktəbin nizamnaməsi" },
  { value: "tedris_plani", label: "Tədris planları" },
  { value: "daxili_qaydalar", label: "Daxili qaydalar" },
  { value: "esasnameler", label: "Əsasnamələr" },
  { value: "standartlar", label: "Təhsil standartları" },
  { value: "illik_plan", label: "İllik fəaliyyət planı" },
  { value: "hesabatlar", label: "Hesabatlar" },
  { value: "elan_serencam", label: "Rəsmi elan və sərəncamlar" },
];

const yesNo = (name: string, label: string, def = true): FieldDef => ({ name, label, type: "boolean", default: def, list: true });

export const RESOURCES: ResourceDef[] = [
  {
    key: "school-years", title: "Tədris illəri", singular: "Tədris ili", table: "school_years", permission: "school.manage",
    orderBy: "start_date DESC", search: ["name"],
    description: "Yalnız bir tədris ili aktiv ola bilər. Aktiv il dəyişdikdə jurnal yeni ilə keçir.",
    fields: [
      { name: "name", label: "Ad (məs. 2025-2026)", type: "text", required: true, max: 20, list: true },
      { name: "start_date", label: "Başlama tarixi", type: "date", required: true, list: true },
      { name: "end_date", label: "Bitmə tarixi", type: "date", required: true, list: true },
      yesNo("is_active", "Aktiv", false),
    ],
  },
  {
    key: "subjects", title: "Fənlər", singular: "Fənn", table: "subjects", permission: "school.manage",
    orderBy: "name_az", search: ["name_az", "code"],
    fields: [
      { name: "name_az", label: "Fənnin adı", type: "text", required: true, max: 100, list: true },
      { name: "code", label: "Kod (məs. RIY, AZD)", type: "text", required: true, max: 20, list: true },
    ],
  },
  {
    key: "classes", title: "Siniflər", singular: "Sinif", table: "classes", permission: "school.manage",
    orderBy: "grade_level, name", search: ["name", "room"], filters: ["school_year_id"],
    fields: [
      { name: "name", label: "Sinif (məs. 9-A)", type: "text", required: true, max: 20, list: true },
      { name: "grade_level", label: "Sinif səviyyəsi (1-11)", type: "number", required: true, min: 1, max: 11, list: true },
      { name: "school_year_id", label: "Tədris ili", type: "select", source: "school_years", required: true, list: true },
      { name: "class_teacher_id", label: "Sinif rəhbəri", type: "select", source: "teachers", list: true },
      { name: "room", label: "Kabinet", type: "text", max: 20, list: true },
      { name: "shift", label: "Növbə", type: "select", options: [{ value: "1", label: "I növbə" }, { value: "2", label: "II növbə" }], default: "1", required: true, list: true },
    ],
  },
  {
    key: "assignments", title: "Fənn təyinatları", singular: "Təyinat", table: "class_subjects", permission: "school.manage",
    orderBy: "class_id, subject_id", search: [], filters: ["class_id", "teacher_id", "school_year_id"],
    description: "Müəllim yalnız ona təyin edilmiş sinif və fənn üzrə qiymət yaza və tapşırıq verə bilər.",
    fields: [
      { name: "class_id", label: "Sinif", type: "select", source: "classes", required: true, list: true },
      { name: "subject_id", label: "Fənn", type: "select", source: "subjects", required: true, list: true },
      { name: "teacher_id", label: "Müəllim", type: "select", source: "teachers", required: true, list: true },
      { name: "school_year_id", label: "Tədris ili", type: "select", source: "school_years", required: true, list: true },
    ],
  },
  {
    key: "teachers", title: "Müəllimlər", singular: "Müəllim", table: "teachers", permission: "teachers.manage",
    softDelete: true, orderBy: "sort_order, last_name, first_name", search: ["first_name", "last_name", "subject", "employee_code"],
    fields: [
      { name: "last_name", label: "Soyad", type: "text", required: true, max: 100, list: true },
      { name: "first_name", label: "Ad", type: "text", required: true, max: 100, list: true },
      { name: "employee_code", label: "Əməkdaş kodu", type: "text", required: true, max: 30, list: true },
      { name: "subject", label: "Tədris etdiyi fənn", type: "text", max: 100, list: true },
      { name: "position_az", label: "Vəzifə", type: "text", max: 150 },
      { name: "education_az", label: "Təhsil", type: "text", max: 500 },
      { name: "qualification", label: "İxtisas / kateqoriya", type: "text", max: 255 },
      { name: "experience_years", label: "Pedaqoji staj (il)", type: "number", min: 0, max: 70 },
      { name: "bio", label: "Qısa bioqrafiya", type: "textarea", max: 3000 },
      { name: "avatar_url", label: "Profil şəkli", type: "image", purpose: "avatar" },
      { name: "phone_private", label: "Telefon (məxfi)", type: "text", max: 30, private: true, help: "İctimai saytda göstərilmir." },
      { name: "address_private", label: "Ünvan (məxfi)", type: "textarea", max: 500, private: true, help: "İctimai saytda göstərilmir." },
      { name: "sort_order", label: "Sıralama", type: "number", default: 0 },
      yesNo("is_public", "Saytda göstər"),
      yesNo("is_active", "Aktiv"),
    ],
  },
  {
    key: "students", title: "Şagirdlər", singular: "Şagird", table: "students", permission: "students.manage",
    viewPermissions: ["students.view_all", "parents.link", "invitations.manage"],
    softDelete: true, orderBy: "last_name, first_name", search: ["first_name", "last_name", "student_code"], filters: ["class_id"],
    description: "Şagird qeydi yaradıldıqdan sonra “Dəvətlər” bölməsindən şagird və valideyn üçün qeydiyyat kodu yaradın.",
    fields: [
      { name: "last_name", label: "Soyad", type: "text", required: true, max: 100, list: true },
      { name: "first_name", label: "Ad", type: "text", required: true, max: 100, list: true },
      { name: "student_code", label: "Şagird kodu", type: "text", required: true, max: 30, list: true },
      { name: "class_id", label: "Sinif", type: "select", source: "classes", list: true },
      { name: "school_year_id", label: "Tədris ili", type: "select", source: "school_years" },
      { name: "user_id", label: "Hesab", type: "number", readOnly: true, list: true },
    ],
  },
  {
    key: "news-categories", title: "Xəbər kateqoriyaları", singular: "Kateqoriya", table: "news_categories", permission: "news.manage_categories",
    orderBy: "name_az", search: ["name_az"], slugFrom: "name_az",
    fields: [
      { name: "name_az", label: "Ad", type: "text", required: true, max: 150, list: true },
      { name: "slug", label: "URL (boş qalsa avtomatik)", type: "text", max: 190, list: true },
      { name: "description_az", label: "Təsvir", type: "textarea", max: 1000 },
    ],
  },
  {
    key: "events", title: "Tədbirlər", singular: "Tədbir", table: "events", permission: "events.manage",
    softDelete: true, orderBy: "start_datetime DESC", search: ["title_az", "location_az"], slugFrom: "title_az", createdByColumn: "created_by",
    fields: [
      { name: "title_az", label: "Tədbirin adı", type: "text", required: true, max: 300, list: true },
      { name: "slug", label: "URL (boş qalsa avtomatik)", type: "text", max: 300 },
      { name: "start_datetime", label: "Başlama", type: "datetime", required: true, list: true },
      { name: "end_datetime", label: "Bitmə", type: "datetime" },
      { name: "location_az", label: "Məkan", type: "text", max: 255, list: true },
      { name: "description_az", label: "Təsvir", type: "markdown", max: 20000 },
      { name: "participants_az", label: "İştirakçılar", type: "textarea", max: 3000 },
      { name: "cover_image", label: "Örtük şəkli", type: "image", purpose: "event" },
      { name: "gallery_id", label: "Bağlı qalereya", type: "select", source: "galleries" },
      { name: "status", label: "Status", type: "select", required: true, default: "planned", list: true, options: [
        { value: "planned", label: "Planlaşdırılıb" }, { value: "ongoing", label: "Davam edir" },
        { value: "completed", label: "Keçirilib" }, { value: "cancelled", label: "Ləğv edilib" },
      ] },
      yesNo("is_published", "Saytda göstər"),
    ],
  },
  {
    key: "galleries", title: "Qalereya albomları", singular: "Albom", table: "galleries", permission: "gallery.manage",
    softDelete: true, orderBy: "COALESCE(event_date, DATE(created_at)) DESC", search: ["title_az", "category_az"], slugFrom: "title_az", createdByColumn: "created_by",
    description: "Yetkinlik yaşına çatmayan şagirdlərin təsviri olan albom yalnız valideyn razılığı təsdiqləndikdən sonra dərc edilə bilər.",
    fields: [
      { name: "title_az", label: "Albomun adı", type: "text", required: true, max: 255, list: true },
      { name: "slug", label: "URL (boş qalsa avtomatik)", type: "text", max: 255 },
      { name: "category_az", label: "Kateqoriya", type: "text", max: 100, list: true },
      { name: "event_date", label: "Tarix", type: "date", list: true },
      { name: "description_az", label: "Təsvir", type: "textarea", max: 3000 },
      { name: "cover_image", label: "Örtük şəkli", type: "image", purpose: "gallery" },
      { name: "contains_minors", label: "Şagirdlərin təsviri var", type: "boolean", default: true, list: true, help: "Fotolarda şagird yoxdursa, işarəni götürün." },
      { name: "consent_confirmed", label: "Valideyn razılığı alınıb", type: "boolean", default: false, list: true, help: "Şagirdlərin təsviri olan albomu dərc etmək üçün razılıq təsdiqlənməlidir. Qaralama kimi saxlamaq üçün tələb olunmur." },
      yesNo("is_published", "Dərc edilsin", false),
    ],
  },
  {
    key: "documents", title: "Sənədlər", singular: "Sənəd", table: "documents", permission: "documents.manage",
    softDelete: true, orderBy: "COALESCE(published_on, DATE(created_at)) DESC", search: ["title_az"], slugFrom: "title_az", createdByColumn: "uploaded_by", filters: ["category_az"],
    fields: [
      { name: "title_az", label: "Sənədin adı", type: "text", required: true, max: 300, list: true },
      { name: "slug", label: "URL (boş qalsa avtomatik)", type: "text", max: 300 },
      { name: "category_az", label: "Kateqoriya", type: "select", options: DOCUMENT_CATEGORY_OPTIONS, required: true, list: true },
      { name: "description_az", label: "Qısa təsvir", type: "textarea", max: 2000 },
      { name: "file_url", label: "PDF fayl", type: "file", purpose: "document", required: true },
      { name: "published_on", label: "Sənədin tarixi", type: "date", list: true },
      yesNo("is_public", "İctimai"),
    ],
  },
  {
    key: "leadership", title: "Rəhbərlik", singular: "Rəhbər şəxs", table: "leadership", permission: "content.manage",
    orderBy: "is_director DESC, sort_order, id", search: ["full_name", "position_az"],
    fields: [
      { name: "full_name", label: "Ad, soyad", type: "text", required: true, max: 200, list: true },
      { name: "position_az", label: "Vəzifə", type: "text", required: true, max: 200, list: true },
      { name: "photo_url", label: "Foto", type: "image", purpose: "avatar" },
      { name: "education_az", label: "Təhsil və ixtisas", type: "text", max: 500 },
      { name: "experience_az", label: "İş təcrübəsi", type: "text", max: 500 },
      { name: "bio_az", label: "Bioqrafiya", type: "markdown", max: 10000 },
      { name: "message_az", label: "Rəsmi müraciət", type: "markdown", max: 10000 },
      { name: "reception_hours_az", label: "Qəbul saatları", type: "text", max: 200 },
      { name: "is_director", label: "Direktor", type: "boolean", default: false, list: true },
      { name: "sort_order", label: "Sıralama", type: "number", default: 0 },
      yesNo("is_published", "Saytda göstər"),
    ],
  },
  {
    key: "achievements", title: "Nailiyyətlər", singular: "Nailiyyət", table: "achievements", permission: "content.manage",
    orderBy: "sort_order, id DESC", search: ["title_az"],
    fields: [
      { name: "title_az", label: "Başlıq", type: "text", required: true, max: 255, list: true },
      { name: "year_label", label: "İl / dövr", type: "text", max: 20, list: true },
      { name: "description_az", label: "Təsvir", type: "textarea", max: 3000 },
      { name: "image_url", label: "Şəkil", type: "image", purpose: "content" },
      { name: "sort_order", label: "Sıralama", type: "number", default: 0 },
      yesNo("is_published", "Saytda göstər"),
    ],
  },
  {
    key: "links", title: "Faydalı keçidlər", singular: "Keçid", table: "useful_links", permission: "content.manage",
    orderBy: "sort_order, id", search: ["title_az", "url"],
    fields: [
      { name: "title_az", label: "Ad", type: "text", required: true, max: 200, list: true },
      { name: "url", label: "Keçid (https://...)", type: "url", required: true, max: 500, list: true },
      { name: "sort_order", label: "Sıralama", type: "number", default: 0 },
      yesNo("is_published", "Saytda göstər"),
    ],
  },
  {
    key: "bell-times", title: "Zəng cədvəli", singular: "Dərs saatı", table: "bell_times", permission: "schedule.manage",
    orderBy: "shift, period", search: [],
    fields: [
      { name: "shift", label: "Növbə", type: "select", options: [{ value: "1", label: "I növbə" }, { value: "2", label: "II növbə" }], required: true, list: true },
      { name: "period", label: "Dərs nömrəsi", type: "number", min: 1, max: 8, required: true, list: true },
      { name: "start_time", label: "Başlama", type: "time", required: true, list: true },
      { name: "end_time", label: "Bitmə", type: "time", required: true, list: true },
    ],
  },
];

export function getResource(key: string): ResourceDef | undefined {
  return RESOURCES.find((r) => r.key === key);
}
