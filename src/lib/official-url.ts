/**
 * Rəsmi təhsil portalı ünvanının yoxlanması (asılılıqsız — həm server, həm unit testlərdə istifadə olunur).
 * Yalnız https, istifadəçi adı/parol hissəsi olmayan və hostu *.edu.az və ya *.gov.az ilə bitən ünvanlar qəbul edilir.
 * Məqsəd: admin parametrləri vasitəsilə fişinq keçidinin yerləşdirilməsinin qarşısını almaq.
 */
export function isOfficialUrl(value: string): boolean {
  try {
    const u = new URL(value);
    const host = u.hostname.toLowerCase();
    return u.protocol === "https:" && !u.username && !u.password && !u.port && (host.endsWith(".edu.az") || host.endsWith(".gov.az"));
  } catch {
    return false;
  }
}
