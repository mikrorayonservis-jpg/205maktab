# Production checklist

## Konfiqurasiya
- [ ] `NODE_ENV=production`, `SITE_URL=https://...`
- [ ] Güclü, unikal `DB_PASSWORD`; DB istifadəçisinin yalnız öz bazasına hüququ var
- [ ] `TRUST_PROXY=1` yalnız reverse proxy varsa
- [ ] SMTP (`SMTP_*`, `MAIL_FROM`) qurulub və test məktubu çatır
- [ ] `STORAGE_DIR` mütləq yol, veb kökündən kənar, yazma icazəsi var
- [ ] `.env` faylı yalnız xidmət istifadəçisi tərəfindən oxunur

## Quraşdırma
- [ ] `npm ci` → `npm run verify` (typecheck, unit, build, inteqrasiya testləri) uğurlu
- [ ] `npm run db:migrate`
- [ ] `npm run admin:create` (v1-dən keçid edilirsə köhnə admin parolu dəyişdirilib)
- [ ] `npm run seed:content`; demo məlumat (`seed:dev`) **istifadə edilməyib**
- [ ] Aktiv tədris ili, siniflər, fənlər, təyinatlar, cədvəl daxil edilib

## Təhlükəsizlik
- [ ] HTTPS sertifikatı və HTTP→HTTPS yönləndirmə
- [ ] Brauzerdə cavab başlıqları: CSP, HSTS, X-Frame-Options, nosniff
- [ ] MySQL yalnız localhost-dan əlçatandır (3306 xaricə açıq deyil)
- [ ] Firewall: yalnız 80/443 açıqdır
- [ ] `npm audit --omit=dev` kritik problem göstərmir

## Məzmun və məxfilik
- [ ] Məxfilik siyasəti və istifadə qaydaları hüquqşünasla razılaşdırılıb
- [ ] Uşaq foto/videoları üçün valideyn razılığı prosesi müəyyənləşib
- [ ] İdxal edilmiş qəzet materiallarında razılıq təsdiqlənib, sonra dərc edilib

## Əməliyyat
- [ ] Gündəlik `npm run backup` planlaşdırılıb və kənar nüsxə qurulub
- [ ] Bərpa sınağı edilib (`docs/deployment/BACKUP_RESTORE.md`)
- [ ] Prosess meneceri (systemd/NSSM/pm2) avtomatik yenidən başladır
- [ ] Server jurnalları saxlanılır və nəzarət olunur
