# Referans layihələrin analizi

Məqsəd: yalnız **struktur, UX, modul arxitekturası və funksional ideyaları** öyrənmək. Heç bir layihədən kod, dizayn və ya resurs kopyalanmayıb; heç bir repository bu layihəyə əlavə edilməyib.

Mənbələr: GitHub README-ləri və canlı demolar (02.11.2026). Qeyd: `sjlps.vercel.app` və `genius-school-ms.xgenious.com` demoları yalnız JavaScript ilə render olunduğu üçün mətn çıxarılmadı — onlar README əsasında qiymətləndirilib. `demo.skuul.org` yalnız giriş ekranına qədər öyrənildi (demo hesablarla daxil olunmadı).

| Layihə | Texnologiya | Güclü tərəflər | Zəif tərəflər | Götürülən konseptual ideya |
|---|---|---|---|---|
| **Skuul** | Laravel 13, Livewire, MySQL 8, Redis | Kampus/tədris ili/sinif/qiymət şkalası modeli; brauzerdə quraşdırma və default parolsuz admin; quraşdırmadan sonra "setup checklist"; ayrıca `.env.testing` | Ağır stek (Redis, Docker); demoda bütün rollar üçün ümumi parol | Aktiv tədris ili anlayışı; ilk admini təhlükəsiz CLI ilə yaratmaq; test bazasının ayrıca olması; idarə panelində "aktiv il yoxdur" xəbərdarlığı |
| **MERN School Website** | React + Vite, Express, MongoDB | Sadə ictimai sayt bölmələri (haqqında, qalereya, heyət, əlaqə); ayrıca admin panel | Testlər yoxdur, təhlükəsizlik iddiaları sənədləşdirilməyib, 3 ayrı layihə, zəif env sənədi | İctimai saytın bölmə ardıcıllığı; heyət kartları; qalereya filtrləri (kateqoriya/il) |
| **Digital Magazine** | Next.js SSG, Strapi CMS | Kateqoriya naviqasiyası, müəllif səhifələri, önizləmə rejimi, OG + JSON-LD, dinamik sitemap | Statik generasiya — redaksiya iş axını CMS-ə həvalə olunub | Xəbər kartlarının iyerarxiyası (lead + siyahı), "önizləmə" düyməsi, NewsArticle structured data, sitemap |
| **Genius School Management** | Laravel 11, Inertia + React, Spatie RBAC | 18 modulun geniş əhatəsi; shared hosting üçün sənəd | Testlər və rol təsvirləri yoxdur; bütün modullar "hazır" deyilir, sübut yoxdur | İcazə əsaslı (permission-based) RBAC — rollar icazələr toplusudur; ev tapşırığı və hesabat modullarının ayrılması |
| **Your School's Newspaper** | Jekyll (statik), GitHub Pages | Bölmələr (elan/idman/klub), təqdimetmə formaları, məxfilik siyasəti səhifəsi | Redaksiya iş axını yoxdur, alfa versiya, quraşdırma sənədi yoxdur | Şagird və müəllimlərin material **təklif** etməsi; təqdim olunan materialın avtomatik dərc edilməməsi |

## Modullar üzrə qiymətləndirmə

**Elektron jurnal.** Skuul və Genius geniş modul əhatəsi verir, lakin hər ikisində sinif/fənn səviyyəsində müəllim əhatəsinin necə məhdudlaşdırıldığı sənədləşdirilməyib. Bizim layihədə bu, `class_subjects` təyinatı üzərindən serverdə məcburi yoxlanılır (`src/server/access.ts`).

**Xəbər sistemi.** Magazine oxu təcrübəsi və SEO baxımından güclüdür, schpaper isə təqdimetmə ideyasını verir. Heç biri çoxmərhələli redaksiya iş axını (müəllif → redaktor → baş redaktor), reviziya tarixçəsi və uşaq fotolarına razılıq nəzarəti təqdim etmir — bunlar bu layihədə əlavə edilib.

**Admin panel.** MERN layihəsinin admin paneli sadə CRUD-dur; Genius/Skuul isə tam idarəetmə verir. Bizdə konfiqurasiya əsaslı CRUD mühərriki (axtarış, filtr, səhifələmə, toplu silmə, CSV ixracı, audit) + xüsusi bölmələr (istifadəçilər, dəvətlər, cədvəl redaktoru) seçilib.
