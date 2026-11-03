# 205 nömrəli məktəbin rəqəmsal platforması

Binəqədi rayonu Rövşən İmanov adına 205 nömrəli tam orta ümumtəhsil məktəbi üçün vahid platforma:

- **Rəsmi sayt** — ana səhifə, məktəb haqqında, rəhbərlik, müəllimlər, sənədlər, əlaqə
- **Xəbər və media redaksiyası** — müəllif → redaktor → baş redaktor iş axını, tədbirlər təqvimi, foto/video qalereya
- **Elektron jurnal** — qiymətlər (2–5), davamiyyət, dərs cədvəli (konflikt yoxlaması), ev tapşırıqları, bildirişlər
- **Kabinetlər** — şagird, valideyn, müəllim, direktor
- **Administrator CMS** — istifadəçilər, rollar, dəvət kodları, sinif/fənn/təyinatlar, məzmun, audit jurnalı

**Texnologiya:** Next.js 15 (App Router) · React 19 · TypeScript (strict) · Tailwind CSS 4 · MySQL 8.4 · Argon2id · Zod

---

## 1. Tələblər

| Komponent | Versiya |
|---|---|
| Node.js | 20.12+ (22 LTS tövsiyə olunur) |
| MySQL | 8.0+ (8.4 sınaqdan keçirilib) |
| ƏS | Windows 10/11, Linux (Ubuntu 22.04+) |

## 2. Quraşdırma (addım-addım)

```bash
# 1) Asılılıqlar
npm install

# 2) Mühit dəyişənləri
copy .env.example .env        # Linux: cp .env.example .env
#    .env faylında DB_* parametrlərini doldurun

# 3) MySQL-də baza və istifadəçi (bir dəfə, root ilə)
#    CREATE DATABASE db_school CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
#    CREATE DATABASE db_school_test CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
#    CREATE USER 'school_app'@'localhost' IDENTIFIED BY '<güclü parol>';
#    GRANT ALL PRIVILEGES ON db_school.* TO 'school_app'@'localhost';
#    GRANT ALL PRIVILEGES ON db_school_test.* TO 'school_app'@'localhost';

# 4) Miqrasiyalar (rollar və icazələr də sinxronlaşdırılır)
npm run db:migrate

# 5) İlk Super Admin (interaktiv; parol heç bir faylda saxlanmır)
npm run admin:create

# 6) Məktəbin real ilkin məzmunu (haqqında, nailiyyətlər, kateqoriyalar, direktor)
npm run seed:content

# 7) (İstəyə bağlı) "Yeni Dövr 205" qəzetinin materiallarını redaksiyaya idxal
npm run import:newspaper

# 8) İşə salma
npm run dev        # http://localhost:3000
```

> Köhnə versiyadan (v1) yüksəldirsinizsə: `npm install` → `npm run db:migrate` → **`npm run admin:create`** (köhnə admin parolu mənbə kodunda açıq saxlanıldığı üçün mütləq dəyişdirilməlidir).

### Development üçün demo məlumatlar
```powershell
$env:DEV_SEED_PASSWORD="Demo-Parol-2026"; npm run seed:dev
```
Demo hesablar `@demo.local` domenindədir. Production-da bu skript işləmir.

## 3. İlk konfiqurasiya (admin paneldə)

1. **Tədris illəri** → cari ili yaradın və "Aktiv" edin
2. **Fənlər**, **Müəllimlər**, **Siniflər** (sinif rəhbəri ilə)
3. **Fənn təyinatları** — hansı müəllim hansı sinifdə hansı fənni keçir (müəllimin icazələri buna əsaslanır)
4. **Şagirdlər** → **Dəvət kodları** (şagird və valideyn üçün)
5. **Cədvəl redaktoru** və **Zəng cədvəli**
6. **Sayt parametrləri**, **Səhifələr**, **Rəhbərlik**

## 4. Əmrlər

| Əmr | Təsvir |
|---|---|
| `npm run dev` / `build` / `start` | Development, production build, production server |
| `npm run typecheck` | TypeScript yoxlaması |
| `npm run test:unit` | Unit testlər (DB tələb etmir) |
| `npm run test:integration` | Real MySQL test bazası + production server üzərində API/təhlükəsizlik testləri |
| `npm run verify` | typecheck + unit + build + integration (tam yoxlama) |
| `npm run db:migrate` (`:test`) | Miqrasiyalar |
| `npm run admin:create` | Super Admin yaratmaq / parolunu sıfırlamaq |
| `npm run user:status -- <e-poçt>` | “Daxil ola bilmirəm” diaqnostikası: hesab varmı, aktivdirmi, təsdiqlənibmi, bloklanıbmı, rollar (parol göstərilmir) |
| `npm run admin:disable-legacy` (`-- --apply`) | Köhnə v1 standart admin hesabını yoxlamaq / deaktiv etmək |
| `npm run seed:content` | Real ilkin məzmun |
| `npm run seed:dev` | Demo məlumatlar (yalnız development) |
| `npm run backup` / `restore` | Ehtiyat nüsxə və bərpa |

## 5. Sənədlər

- [Arxitektura](docs/architecture/ARCHITECTURE.md)
- [API sənədləri](docs/api/API.md)
- [Deployment](docs/deployment/DEPLOYMENT.md)
- [Backup və bərpa](docs/deployment/BACKUP_RESTORE.md)
- [Təhlükəsizlik hesabatı](docs/security/SECURITY_REPORT.md)
- [Test hesabatı](docs/testing/TEST_REPORT.md)
- [Production checklist](docs/PRODUCTION_CHECKLIST.md)
- [Referans layihələrin analizi](docs/analysis/reference-projects.md)
- [Rəsmi Elektron Jurnal inteqrasiyası — texniki hesabat və yol xəritəsi](docs/integration/OFFICIAL_JOURNAL_INTEGRATION.md)

## 6. Qovluq strukturu

```
src/
  app/
    (site)/        ictimai sayt (ana səhifə, xəbərlər, tədbirlər, qalereya, sənədlər...)
    (auth)/        giriş, qeydiyyat, parol bərpası, e-poçt təsdiqi
    (app)/         kabinet: dashboard, jurnal, qiymətlər, davamiyyət, cədvəl, tapşırıqlar, redaksiya
    (app)/admin/   administrator CMS
    api/           REST API (route handlers)
    media/         ictimai media faylları (storage/public)
  components/      ui/ (dizayn sistemi), site/, app/, admin/, charts/
  config/          rbac.json (rollar və icazələr), admin-resources.ts
  lib/             db, auth (sessiya, parol, RBAC), http (API sarğısı), csrf, rate-limit, audit, storage, markdown, format
  server/          biznes məntiqi: access (əhatə/IDOR), grades, attendance, schedule, homework, news, content, accounts, users, stats
database/migrations/   001–012 SQL miqrasiyalar
scripts/               migrate, admin-create, seed-content, import-newspaper, seed-dev, backup, restore
tests/unit, tests/integration
docs/
```

## 7. TODO / məhdudiyyətlər

- SMTP serveri təyin edilməlidir (e-poçt təsdiqi və parol bərpası üçün). Development-də keçidlər server konsoluna yazılır.
- Mətn redaktoru Markdown əsaslıdır (təhlükəsizlik üçün HTML qəbul edilmir).
- Bildirişlər daxilidir (e-poçt/SMS ilə göndərilmir).
- İngilis dili versiyası yoxdur (tələbə uyğun olaraq yalnız Azərbaycan dili).

## 8. Bilinən problem: OneDrive qovluğu

Layihə OneDrive ilə sinxronlaşan qovluqdadırsa (`C:\Users\...\OneDrive\...`), Next.js `.next` qovluğunda
`EINVAL: invalid argument, readlink ...\.next\...` xətası verə bilər (OneDrive faylları "reparse point" kimi saxlayır).

- Müvəqqəti həll: `npm run clean` (və ya `npm run dev` — artıq avtomatik təmizləyir).
- Daimi həll: layihəni OneDrive-dan kənar qovluğa köçürün, məsələn `C:\Projects\Qezet-205-Mekteb`:
  ```powershell
  robocopy "C:\Users\lamfo\OneDrive\Desktop\Qezet-205-Mekteb" "C:\Projects\Qezet-205-Mekteb" /E /XD node_modules .next
  cd C:\Projects\Qezet-205-Mekteb
  npm install
  npm run dev
  ```
