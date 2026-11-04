// Azərbaycan dilinə uyğun axtarış normallaşdırması (saf funksiyalar; server və testlərdə istifadə olunur).
// "I/ı" və "İ/i" cütləri kiçik hərfə salınanda dilə görə fərqli nəticə verir, ona görə hər iki tərəfdə
// ı → i qatlanır: "İLK", "ilk", "ILK" eyni sözü tapır. Digər hərflər (ə ö ü ş ç ğ) olduğu kimi qalır.

export const MAX_SEARCH_TERMS = 6;

export function foldSearchText(s: string): string {
  return s.toLocaleLowerCase("az").replace(/ı/g, "i").replace(/̇/g, "");
}

/** Sorğunu sözlərə bölür: boşluqlar normallaşdırılır, təkrarlar atılır, ən çox 6 söz. */
export function searchTerms(q: string | undefined | null): string[] {
  if (!q) return [];
  const words = foldSearchText(q).split(/\s+/).map((w) => w.trim()).filter(Boolean);
  return [...new Set(words)].slice(0, MAX_SEARCH_TERMS);
}

export function likePattern(term: string): string {
  return `%${term.replace(/[\%_]/g, "\$&")}%`;
}

/** SQL tərəfdə eyni qatlama: lower() + ı→i, birləşdirici nöqtə (U+0307) silinir. */
export function sqlFold(expr: string): string {
  return `translate(lower(COALESCE(${expr}, '')), 'ı' || chr(775), 'i')`;
}
