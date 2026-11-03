# Test hesabatı

## Test dəsti

| Səviyyə | Fayl | Əhatə |
|---|---|---|
| Unit | `tests/unit/markdown.test.mjs` | XSS: `<script>`, `javascript:`/`data:`/`//` keçidləri, atribut injection, yalnız yerli şəkillər, formatlama |
| Unit | `tests/unit/format-slug.test.mjs` | DD.MM.YYYY, 24 saat, Asia/Baku çevirməsi, həftə günləri, Azərbaycan hərfli slug |
| Unit | `tests/unit/official-url.test.mjs` | Rəsmi portal ünvanının yoxlanması: http, oxşar domenlər (`jurnal-edu.az.evil.com`), userinfo, port, `javascript:` rədd edilir |
| Unit | `tests/unit/admin-resources.test.mjs` | Admin CRUD-da SQL identifikatorlarının təhlükəsizliyi, RBAC: şagird/valideyn/müəllifin idarəetmə icazəsi yoxdur |
| İnteqrasiya | `tests/integration/01-auth.test.mjs` | Giriş, HttpOnly cookie, ümumi xəta mesajı, CSRF, xarici Origin, çıxışdan sonra token etibarsızlığı, təsdiqlənməmiş/deaktiv hesab, brute-force (429), dəvətsiz qeydiyyat, yönləndirmə, təhlükəsizlik başlıqları |
| İnteqrasiya | `tests/integration/02-isolation.test.mjs` | **Tapşırığın 7 məcburi ssenarisi** (bax aşağı) |
| İnteqrasiya | `tests/integration/04-official-journal.test.mjs` | Rəsmi jurnal keçidi: müəllim/direktor görür (`target=_blank`, `rel=noopener noreferrer`), şagird/valideyn/redaktor üçün 404/403 və menyuda yoxdur, CSRF, audit qeydi və “son keçid”, saxta ünvanın parametrlərdə rədd edilməsi, uydurma “daxil olub” statusunun olmaması, `/api/integrations/journal/status` faktları (yalnız Mərhələ 1 aktiv), məktəbdaxili jurnalda xəbərdarlıq |
| İnteqrasiya | `tests/integration/03-features.test.mjs` | Dəvət + qeydiyyat, redaksiya iş axını və razılıq, XSS (dərc edilmiş səhifədə), cədvəl konflikti (müəllim/sinif/kabinet), ev tapşırığı + şəxsi fayl girişi, MIME saxtakarlığı, bildirişlərin izolyasiyası, SQL injection, hesabat icazəsi, ictimai səhifələr/sitemap/robots/404 |

### Məcburi ssenarilər (02-isolation)
1. Şagird başqa şagirdin qiymətlərini görə bilmir (API, sinif filtri, jurnal, davamiyyət)
2. Valideyn başqa ailənin uşağını görə bilmir (eyni sinifdə olsa belə)
3. Müəllim təyin olunmadığı sinif/fənn üçün qiymət yaza, dəyişə, silə bilmir; başqa sinfin şagirdini öz sinfinə yaza bilmir
4. Redaktor admin səlahiyyəti əldə edə bilmir; school_admin super_admin rolu verə bilmir
5. Şagird/valideyn/müəllim admin API və səhifələrinə daxil ola bilmir (səhifə 404 qaytarır); konfiqurasiyadan kənar sütun qəbul edilmir
6. Müəllimin məxfi telefon/ünvanı ictimai səhifələrdə görünmür; anonim sorğular 401
7. Qiymət yaratma/düzəliş/silmə və davamiyyət dəyişiklikləri audit jurnalında köhnə və yeni dəyərlərlə saxlanılır; qiymət soft delete

## İcra nəticələri

| Yoxlama | Mühit | Nəticə |
|---|---|---|
| `tsc --noEmit` (strict) | Windows, Node 22, MySQL 8.4 | **Uğurlu — 0 xəta** |
| `npm run test:unit` | Windows | **19 / 19 uğurlu** |
| `npm run build` | Windows | **Uğurlu** — 54 səhifə, bütün API marşrutları |
| `npm run test:integration` | Windows, MySQL 8.4 (`db_school_test`), production server | **28 / 28 uğurlu** (02.11.2026) — 04-official-journal (7 test) əlavə edildikdən sonra Windows-da yenidən icra edilməlidir |
| `tsc --noEmit` + `test:unit` (03.11.2026, Path B sonrası) | Linux VM | **0 xəta**, **21 / 21 uğurlu** |

### Tapılan və düzəldilən problemlər
| Problem | Səbəb | Həll |
|---|---|---|
| v1 baza cədvəllərinin bir hissəsi (teachers, lessons, homework, news_categories, events, notifications) mövcud deyildi | v1 miqrasiya icraçısı şərh sətri ilə başlayan SQL ifadələrini ötürürdü | Miqrasiya icraçısı ifadələri düzgün bölür, 001–008-i hər dəfə idempotent tamamlayır, yarımçıq icranı ("artıq mövcuddur") tanıyır |
| İcazəsiz/mövcud olmayan səhifələr "tapılmadı" məzmunu ilə, lakin HTTP 200 qaytarırdı (ilk icra: 25/28) | `loading.tsx` streaming-i status kodu qərarından əvvəl başladırdı | `(app)` və `(site)` qruplarındakı `loading.tsx` silindi; testlər HTML məzmununda sızma yoxlaması ilə gücləndirildi |

## Manual yoxlama siyahısı (responsive / accessibility)
- [ ] 375 px (mobil), 768 px (planşet), 1280 px (masaüstü) — menyu, cədvəllər üfüqi sürüşür, formalar
- [ ] Yalnız klaviatura ilə: "Əsas məzmuna keç" keçidi, menyu (Esc bağlayır), dialoqlar (fokus tələsi, Esc), jurnal düymələri
- [ ] Açıq/qaranlıq rejim kontrastı
- [ ] Ekran oxuyucu: qrafiklərin cədvəl alternativi, formaların label-ləri, xəta mesajları `role="alert"`
