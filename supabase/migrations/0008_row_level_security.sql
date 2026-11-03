-- 0008_row_level_security.sql
-- Supabase Data API (PostgREST) üzərindən heç bir məlumata giriş yoxdur.
--
-- Arxitektura: brauzer bazaya birbaşa müraciət etmir. Bütün oxuma/yazma əməliyyatları Next.js
-- serverində (src/server/*) aparılır; orada sessiya, RBAC (src/config/rbac.json) və məlumat əhatəsi
-- (src/server/access.ts: şagird → özü, valideyn → yalnız öz uşaqları, müəllim → yalnız təyin
-- olunduğu sinif/fənn) yoxlanılır. Server bazaya cədvəllərin sahibi olan rol ilə qoşulur.
--
-- Publishable (anon) açar ictimaidir və brauzerdə görünə bilər. Ona görə:
--   1) bütün cədvəllərdə RLS aktivdir və anon/authenticated üçün HEÇ BİR policy yoxdur
--      (RLS "default deny" — heç bir sətir qaytarılmır, heç bir yazma qəbul edilmir);
--   2) anon/authenticated rollarından cədvəl, ardıcıllıq və funksiya hüquqları alınır;
--   3) gələcəkdə yaradılan obyektlər üçün də defolt hüquqlar alınır.
-- Nəticədə publishable açarla şagird, valideyn, müəllim və ya qiymət məlumatı oxumaq mümkün deyil.
--
-- Yeni cədvəl əlavə edən hər miqrasiya həmin cədvəl üçün "ENABLE ROW LEVEL SECURITY" etməlidir.
-- Yoxlama sorğusu: supabase/README.md → "Yoxlama sorğuları".

-- 1) RLS bütün public cədvəllərində (o cümlədən schema_migrations)
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN SELECT tablename FROM pg_catalog.pg_tables WHERE schemaname = 'public'
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', r.tablename);
  END LOOP;
END
$$;

-- 2) və 3) Supabase API rollarından hüquqların alınması (rollar yalnız Supabase-də mövcuddur;
--    lokal Postgres/test mühitində bu blok heç nə etmir)
DO $$
DECLARE
  api_role text;
BEGIN
  FOREACH api_role IN ARRAY ARRAY['anon', 'authenticated']
  LOOP
    IF EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = api_role) THEN
      EXECUTE format('REVOKE ALL ON ALL TABLES IN SCHEMA public FROM %I', api_role);
      EXECUTE format('REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM %I', api_role);
      EXECUTE format('REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM %I', api_role);
      EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM %I', api_role);
      EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM %I', api_role);
      EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON FUNCTIONS FROM %I', api_role);
    END IF;
  END LOOP;
END
$$;

-- Funksiyalar PUBLIC psevdo-roluna defolt olaraq EXECUTE verir; API rolları onu PUBLIC vasitəsilə
-- miras almasın deyə köməkçi funksiyalardan PUBLIC hüququ da alınır.
REVOKE ALL ON FUNCTION public.baku_today() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.baku_now() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.set_updated_at() FROM PUBLIC;
