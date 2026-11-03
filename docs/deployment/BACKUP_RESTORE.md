# Backup və bərpa

## Nə saxlanılır
| Komponent | Üsul | Yer |
|---|---|---|
| MySQL bazası | `mysqldump --single-transaction` (kilidsiz, ardıcıl snapshot) | `backups/<tarix>/database.sql` |
| Yüklənmiş fayllar | `storage/` qovluğunun surəti | `backups/<tarix>/storage/` |
| Manifest | tarix, baza adı | `backups/<tarix>/manifest.json` |

`.env` faylı ehtiyat nüsxəyə **daxil edilmir** (parollar). Onu ayrıca, şifrələnmiş parol menecerində saxlayın.

## Ehtiyat nüsxə
```bash
npm run backup
```
- Parol prosess siyahısında görünməsin deyə müvəqqəti `--defaults-extra-file` istifadə olunur və dərhal silinir.
- Son `BACKUP_KEEP` (default 14) nüsxə saxlanılır.
- Windows-da `mysqldump` PATH-da deyilsə: `.env`-də `MYSQLDUMP_PATH="C:\Program Files\MySQL\MySQL Server 8.4\bin\mysqldump.exe"`.

**Planlaşdırma**
- Linux (cron, hər gecə 02:30): `30 2 * * * cd /opt/mekteb && /usr/bin/npm run backup >> /var/log/mekteb-backup.log 2>&1`
- Windows: Task Scheduler → "Daily 02:30" → Program: `npm.cmd`, Arguments: `run backup`, Start in: layihə qovluğu.

**Kənar nüsxə (3-2-1 qaydası):** `backups/` qovluğunu gündəlik olaraq başqa diskə və ya şifrələnmiş bulud yaddaşına köçürün.

## Bərpa
```bash
npm run restore -- --from=backups/2026-11-02-02-30-00
```
Skript baza adını yazmağınızı tələb edir, sonra SQL-i yükləyir və `storage/`-i bərpa edir. Sonra tətbiqi yenidən başladın.

## Bərpa sınağı (ayda bir dəfə tövsiyə olunur)
```bash
npm run restore -- --from=backups/<son nüsxə> --test   # DB_NAME_TEST bazasına yüklənir
```
Yoxlayın: `SELECT COUNT(*) FROM users; SELECT COUNT(*) FROM grades;` dəyərləri əsas baza ilə uyğun olmalıdır. Nəticəni `docs/testing/TEST_REPORT.md`-yə qeyd edin.
