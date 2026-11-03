-- supabase/storage.sql
-- Yüklənmiş fayllar üçün ŞƏXSİ Storage bucket-ı. Supabase Dashboard → SQL Editor-də bir dəfə icra edin
-- (və ya Dashboard → Storage → New bucket: ad "school-files", Public bucket SÖNDÜRÜLMÜŞ).
--
-- Bucket ictimai deyil və storage.objects üçün heç bir policy əlavə edilmir: publishable açarla
-- faylları oxumaq və ya yükləmək mümkün deyil. Fayllar yalnız tətbiq serveri (SUPABASE_SECRET_KEY) ilə
-- yazılır/oxunur və istifadəçiyə tətbiqin /media/* (ictimai) və /api/files/:id (icazə yoxlanaraq) marşrutları
-- ilə verilir. Bu fayl lokal/test Postgres-də deyil, yalnız Supabase-də icra olunur.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'school-files',
  'school-files',
  false,
  16 * 1024 * 1024,
  ARRAY[
    'image/webp', 'image/jpeg', 'image/png', 'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- Yoxlama: bucket şəxsi olmalıdır (public = false) və storage.objects üzərində anon/authenticated üçün policy olmamalıdır
SELECT id, public, file_size_limit FROM storage.buckets WHERE id = 'school-files';
SELECT policyname, roles, cmd FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects';
