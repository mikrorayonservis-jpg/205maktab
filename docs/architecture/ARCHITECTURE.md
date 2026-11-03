# Arxitektura

## Ümumi baxış
Bir Next.js tətbiqi (modul monolit) üç sistemi eyni domen, vahid dizayn sistemi, vahid autentifikasiya və ortaq MySQL bazası ilə birləşdirir.

```
Brauzer ──► middleware (CSRF cookie, CSP nonce, qorunan səhifələrə yönləndirmə)
              │
              ├─► Server komponentləri (səhifələr) ──► src/server/* ──► MySQL
              └─► /api/* route handlers ── route() sarğısı:
                     CSRF + Origin → sessiya (DB) → icazə (RBAC) → zod validasiya → servis → audit
```

## Qatlar
| Qat | Yer | Məsuliyyət |
|---|---|---|
| Təqdimat | `src/app`, `src/components` | Server komponentləri məlumatı birbaşa servislərdən oxuyur; interaktiv hissələr (jurnal, redaktor, CMS) klient komponentləridir və yalnız API ilə işləyir |
| API | `src/app/api/**/route.ts` | İncə qat: `route()` sarğısı + zod sxemi + servis çağırışı |
| Biznes məntiqi | `src/server/*` | Qaydalar, əhatə (scope), tranzaksiyalar, bildirişlər, audit |
| İnfrastruktur | `src/lib/*` | DB hovuzu, sessiyalar, RBAC, CSRF, rate limit, fayl saxlama, Markdown, format |

## Autentifikasiya
- Server sessiyaları: cookie-də 256-bit təsadüfi token, DB-də yalnız SHA-256 hash (`sessions`). Çıxış, parol dəyişikliyi, deaktivasiya və rol azaldılması sessiyaları dərhal ləğv edir.
- Parollar: Argon2id (m=19 MiB, t=2, p=1).
- Qeydiyyat yalnız birdəfəlik **dəvət kodu** ilə (kod DB-də hash kimi saxlanılır); kod rolu və şagird/müəllim bağlantısını müəyyən edir.

## Avtorizasiya (RBAC + məlumat əhatəsi)
1. **İcazələr** (`src/config/rbac.json`) — 12 rol, 34 icazə; miqrasiya zamanı DB-yə sinxronlaşdırılır.
2. **Əhatə** (`src/server/access.ts`) — hər akademik sorğuya məcburi SQL şərti əlavə olunur:
   - şagird → yalnız özü; valideyn → `parent_student`; müəllim → `class_subjects` təyinatları; sinif rəhbəri → öz sinfi; `*.view_all` → hamısı.
3. Səhifələrdə icazə yoxdursa **404** qaytarılır (resursun mövcudluğu açıqlanmır).

## Məlumat bazası
- 001–008: ilkin sxem (v1), 009–012: v2 genişlənmələri (sessiya, dəvət, rate limit, fayllar, rəhbərlik, səhifələr, qiymət növləri, dərs üzrə davamiyyət, redaksiya iş axını, razılıq bayraqları).
- Bütün cədvəllər `utf8mb4_unicode_ci`, InnoDB, xarici açarlar və indekslər; sessiya saat qurşağı `+04:00`.
- Qiymət, ev tapşırığı, xəbər, sənəd, qalereya və müəllim/şagird üçün soft delete.

## Fayllar
`storage/public` (xəbər/qalereya/sənəd) — `/media/*` ilə, yalnız DB-də "public" kimi qeyd olunan fayllar verilir.
`storage/private` (ev tapşırıqları və cavablar) — `/api/files/:id` ilə, hər sorğuda giriş hüququ yoxlanılır.
Şəkillər WebP-yə çevrilir, ölçüsü azaldılır, EXIF/GPS silinir.
