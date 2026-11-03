# Təhlükəsizlik hesabatı

Tarix: 02.11.2026 · Versiya: 2.0.0

## 1. v1 (opencode başlanğıcı) auditində tapılan problemlər və həlli

| # | Problem | Risk | Həll |
|---|---|---|---|
| 1 | DB parolu və admin parolu (`Admin2026!`) mənbə kodunda (`.env.example`, `db.ts`, `scripts/*`) | Kritik | Fayllar silindi; default parollar yoxdur; admin yalnız `npm run admin:create` ilə (interaktiv). **Köhnə admin parolunu dəyişin.** |
| 2 | Login-də rollar səhv oxunurdu (`const [rows] = await query()`) | Yüksək | Sessiya hər sorğuda DB-dən rol+icazə yükləyir |
| 3 | Middleware API-yə `x-auth-user-*` başlıqları ötürürdü | Yüksək | Silindi; kimlik yalnız server sessiyasından |
| 4 | JWT sessiyası serverdə ləğv edilə bilmirdi | Orta | DB sessiyaları (hash), çıxış/parol dəyişikliyi/deaktivasiyada ləğv |
| 5 | CSRF funksiyaları var idi, istifadə olunmurdu | Yüksək | Mərkəzi `route()` sarğısında məcburi |
| 6 | Açıq qeydiyyat hər kəsə "student" rolu verirdi | Yüksək | Yalnız birdəfəlik dəvət kodu ilə qeydiyyat |
| 7 | Rate limit yox idi | Orta | DB əsaslı rate limit (login, qeydiyyat, bərpa, yükləmə) + hesab kilidi |
| 8 | `attendance` cədvəlində (şagird, tarix) unikal açarı dərs üzrə davamiyyətə imkan vermirdi | Məlumat bütövlüyü | (şagird, tarix, dərs) unikal açarı |

## 2. Tətbiq edilmiş nəzarətlər (OWASP Top 10)

| OWASP | Nəzarət |
|---|---|
| A01 Broken Access Control | Hər API `route()` ilə: auth → icazə; akademik məlumatlar `access.ts` əhatə şərtləri ilə; ID manipulyasiyası (IDOR) testlərlə yoxlanılır; admin səhifələri icazəsiz istifadəçiyə 404 |
| A02 Cryptographic Failures | Argon2id; sessiya/dəvət/bərpa tokenləri yalnız SHA-256 hash; HTTPS-də `Secure` + `__Host-` cookie, HSTS |
| A03 Injection | Bütün sorğular parametrləşdirilmiş; admin CRUD-da SQL identifikatorları yalnız konfiqurasiyadan (regex yoxlaması); zod validasiya; CSV formula injection qorunması |
| A03 XSS | React escape; istifadəçi mətni üçün öz təhlükəsiz Markdown rendereri (əvvəl escape, sonra ağ siyahı; `javascript:`/`data:` keçidləri bloklanır); JSON-LD `<` escape; nonce əsaslı CSP + `strict-dynamic` |
| A04 Insecure Design | Redaksiyada məqalələr avtomatik dərc olunmur; uşaq təsvirləri razılıq olmadan dərc edilmir (server qaydası) |
| A05 Misconfiguration | `poweredByHeader: false`, CSP, `X-Frame-Options`, `nosniff`, `Referrer-Policy`, `Permissions-Policy` |
| A07 Auth Failures | Ümumi xəta mesajı (istifadəçi sadalanmasına qarşı), zaman bərabərləşdirmə (fake verify), e-poçt üzrə və IP üzrə limit, 10 uğursuz cəhddən sonra 15 dəq kilid, giriş cəhdləri jurnalı, e-poçt təsdiqi |
| A08 Integrity | Miqrasiya checksum-ları; audit jurnalı (köhnə/yeni dəyərlər, həssas sahələr çıxarılır) |
| A09 Logging | `audit_logs`, `login_attempts`, admin paneldə filtr və CSV ixracı |
| A10 SSRF | Server xarici URL-lərə sorğu göndərmir; video keçidləri yalnız YouTube/Vimeo ID-sinə çevrilir |

## 3. Fayl yükləmə
- MIME "magic bytes" ilə yoxlanılır (fayl adı/Content-Type-a etibar edilmir); JPG/PNG/WebP, PDF, DOCX/XLSX/PPTX.
- Ölçü limitləri: şəkil 8 MB, PDF 15 MB, sənəd 10 MB; istifadəçi başına saatda 60 yükləmə.
- Şəkillər yenidən kodlanır (WebP) — zərərli metadata və EXIF/GPS silinir.
- Fayllar təsadüfi adla `storage/`-də (veb kökündən kənarda); şəxsi fayllar hər sorğuda yoxlanılır, `Content-Security-Policy: sandbox`.

## 4. Məxfilik
- Müəllimin şəxsi telefon/ünvanı ictimai sorğularda seçilmir.
- Şagirdlərin ictimai profili yoxdur.
- Valideyn yalnız `parent_student` ilə bağlı uşağını görür; bağlantı yalnız dəvət kodu və ya admin tərəfindən.

## 4a. Rəsmi Elektron Jurnal inteqrasiyası (Path B)
- Yalnız yeni tabda keçid (`target=_blank`, `rel=noopener noreferrer`, `referrerpolicy=no-referrer`). Rəsmi sistemin cookie, sessiya və ya tokenlərinə toxunulmur, məlumat çəkilmir.
- Sayt rəsmi autentifikasiya vəziyyətini **göstərmir və uydurmur**; yalnız “bu saytdan son keçid” vaxtı (öz audit jurnalımızdan) göstərilir.
- Admin parametrlərində keçid ünvanı yalnız `https://` + `*.edu.az`/`*.gov.az` ola bilər (fişinq keçidinin yerləşdirilməsinin qarşısı alınır); yanlış dəyər saxlanılsa belə göstərişdə standart ünvan istifadə olunur.
- Məktəbdaxili jurnal səhifəsində onun rəsmi dövlət jurnalı olmadığı açıq bildirilir.
- mygov ID / SİMA ilə SSO (Path A) **həyata keçirilməyib** — rəsmi müqavilə və client qeydiyyatı tələb edir.

## 5. Qalıq risklər və tövsiyələr
- SMTP konfiqurasiya edilməlidir; əks halda e-poçt təsdiqi işləmir.
- `TRUST_PROXY=1` yalnız reverse proxy arxasında. IP məlum olmadıqda (`TRUST_PROXY=0`) IP üzrə limit tətbiq edilmir (hamını bloklamamaq üçün); hesab üzrə limitlər (8 cəhd / 15 dəq) həmişə işləyir.
- 2FA (iki mərhələli giriş) admin hesabları üçün gələcək mərhələdə tövsiyə olunur.
- Mütəmadi `npm audit` və asılılıq yeniləmələri.
- Ehtiyat nüsxələrin şifrələnmiş kənar yaddaşda saxlanması.
