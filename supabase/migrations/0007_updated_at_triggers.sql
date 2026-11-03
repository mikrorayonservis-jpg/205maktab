-- 0007_updated_at_triggers.sql
-- updated_at sütunu olan bütün cədvəllərdə UPDATE zamanı avtomatik yenilənmə
-- (MySQL-dəki "ON UPDATE CURRENT_TIMESTAMP" davranışının ekvivalenti).

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'users', 'teachers', 'classes', 'students', 'parents',
    'lessons', 'grades', 'attendance', 'homework', 'homework_submissions',
    'galleries', 'news', 'events', 'documents', 'leadership', 'achievements',
    'pages', 'site_settings'
  ]
  LOOP
    EXECUTE format(
      'CREATE TRIGGER trg_%1$s_updated_at BEFORE UPDATE ON public.%1$I FOR EACH ROW EXECUTE FUNCTION public.set_updated_at()',
      t
    );
  END LOOP;
END
$$;
