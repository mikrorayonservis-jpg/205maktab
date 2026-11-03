-- 0001_extensions_and_helpers.sql
-- Saat qurşağı və ortaq köməkçi funksiyalar (heç bir əlavə genişlənmə tələb olunmur).
--
-- Tətbiq MySQL dövründə sessiya saat qurşağı +04:00 (Asia/Baku) ilə işləyirdi. Postgres-də
-- bütün vaxt damğaları TIMESTAMPTZ kimi saxlanılır (mütləq an), "bu gün" və "yerli vaxt"
-- hesablamaları isə aşağıdakı funksiyalarla açıq şəkildə Asia/Baku üzrə aparılır — sessiyanın
-- saat qurşağından asılı deyil.
--
-- E-poçt ünvanları tətbiqdə həmişə kiçik hərflə saxlanılır; unikallıq lower(email) indeksləri ilə
-- hərf registrindən asılı olmadan təmin edilir (MySQL utf8mb4_unicode_ci davranışı).

-- Bazanın defolt saat qurşağı (əlavə qoruma: CURRENT_DATE / ::date çevrilmələri Bakı vaxtı ilə).
-- Qeyd: yalnız yeni bağlantılara təsir edir. Tətbiq kodu buna güvənmir (baku_now/baku_today istifadə edir).
DO $$
BEGIN
  EXECUTE format('ALTER DATABASE %I SET timezone TO %L', current_database(), 'Asia/Baku');
END
$$;

-- Bakı vaxtı ilə cari tarix (MySQL CURDATE() ekvivalenti)
CREATE OR REPLACE FUNCTION public.baku_today() RETURNS date
  LANGUAGE sql STABLE
  SET search_path = ''
AS $$ SELECT (pg_catalog.now() AT TIME ZONE 'Asia/Baku')::date $$;

-- Bakı vaxtı ilə cari yerli vaxt (saat qurşağısız TIMESTAMP sütunları ilə müqayisə üçün: events)
CREATE OR REPLACE FUNCTION public.baku_now() RETURNS timestamp
  LANGUAGE sql STABLE
  SET search_path = ''
AS $$ SELECT (pg_catalog.now() AT TIME ZONE 'Asia/Baku')::timestamp(0) $$;

-- updated_at sütununu avtomatik yeniləyən trigger funksiyası (MySQL ON UPDATE CURRENT_TIMESTAMP)
CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS trigger
  LANGUAGE plpgsql
  SET search_path = ''
AS $$
BEGIN
  NEW.updated_at := pg_catalog.now();
  RETURN NEW;
END
$$;
