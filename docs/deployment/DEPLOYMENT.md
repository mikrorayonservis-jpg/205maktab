# Deployment bələdçisi

> **03.11.2026:** baza MySQL-dən Supabase Postgres-ə köçürülüb. Cari yol — Vercel + Supabase: [SUPABASE_VERCEL.md](SUPABASE_VERCEL.md).
> Aşağıdakı VPS/Windows təlimatları MySQL dövrünə aiddir; öz serverinizdə işlədəcəksinizsə MySQL əvəzinə `DATABASE_URL` (Postgres) istifadə edin.

Platforma Node.js tələb edir (Next.js server render, API, fayl yükləmə). Paylaşılan PHP hostinqi uyğun deyil; VPS, Windows Server və ya Node dəstəkli hostinq lazımdır.

## Variant A — Linux VPS (Ubuntu 22.04+, nginx, systemd)

```bash
# 1. Node 22 LTS və MySQL 8
sudo apt install mysql-server nginx
# Node: https://nodejs.org (rəsmi paket)

# 2. Kod
sudo mkdir -p /opt/mekteb && sudo chown $USER /opt/mekteb
cd /opt/mekteb && <layihəni köçürün>
npm ci
cp .env.example .env   # NODE_ENV=production, SITE_URL=https://domen.az, TRUST_PROXY=1, SMTP_*
npm run db:migrate
npm run admin:create
npm run seed:content
BUILD_STANDALONE=1 npm run build
```

`BUILD_STANDALONE=1` ilə `output: "standalone"` aktivləşir (Windows PowerShell: `$env:BUILD_STANDALONE="1"; npm run build`). Adi `npm run build` + `npm start` də işləyir. Standalone build-dən sonra:
```bash
cp -r public .next/standalone/ && cp -r .next/static .next/standalone/.next/
```

**systemd** (`/etc/systemd/system/mekteb.service`):
```ini
[Unit]
Description=205 mekteb platformasi
After=network.target mysql.service

[Service]
WorkingDirectory=/opt/mekteb
EnvironmentFile=/opt/mekteb/.env
ExecStart=/usr/bin/node .next/standalone/server.js
Environment=PORT=3000 HOSTNAME=127.0.0.1
Restart=always
User=mekteb

[Install]
WantedBy=multi-user.target
```
> `STORAGE_DIR` mütləq yolla (`/opt/mekteb/storage`) təyin edilməlidir, çünki standalone server başqa qovluqdan işləyir.

**nginx**:
```nginx
server {
  listen 443 ssl http2;
  server_name domen.az;
  ssl_certificate     /etc/letsencrypt/live/domen.az/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/domen.az/privkey.pem;
  client_max_body_size 16m;
  gzip on; gzip_types text/css application/javascript application/json image/svg+xml;
  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $remote_addr;   # TRUST_PROXY=1 üçün (müştəri başlığını əvəz edir)
    proxy_set_header X-Forwarded-Proto https;
  }
}
server { listen 80; server_name domen.az; return 301 https://$host$request_uri; }
```

## Variant B — Windows Server / Windows 10–11 (IIS və ya birbaşa)

1. Node.js 22 LTS və MySQL 8.4 (Windows Service kimi) quraşdırın.
2. Layihə qovluğunda: `npm ci`, `.env`, `npm run db:migrate`, `npm run admin:create`, `npm run seed:content`, `npm run build`.
3. Xidmət kimi işə salmaq üçün NSSM və ya `pm2` (`pm2 start node_modules/next/dist/bin/next --name mekteb -- start -p 3000`).
4. İctimai giriş üçün IIS + URL Rewrite + ARR ilə HTTPS reverse proxy qurun, `TRUST_PROXY=1`.

## Vacib qeydlər
- **HTTPS məcburidir.** `SITE_URL` `https://` ilə başlayanda cookie-lər `Secure` + `__Host-` prefiksi ilə, HSTS və `upgrade-insecure-requests` ilə işləyir.
- `TRUST_PROXY=1` yalnız tətbiq **həqiqətən** reverse proxy arxasında olduqda — əks halda IP saxtalaşdırıla bilər.
- `storage/` və `backups/` qovluqlarını veb-serverin statik qovluğuna yerləşdirməyin.
- SMTP olmadan e-poçt təsdiqi və parol bərpası işləmir (production-da xəta jurnala yazılır).
