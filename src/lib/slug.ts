/** Azərbaycan hərflərini nəzərə alan URL slug generatoru. */
const MAP: Record<string, string> = {
  ə: "e", Ə: "e", ı: "i", I: "i", İ: "i", ö: "o", Ö: "o", ü: "u", Ü: "u", ş: "s", Ş: "s", ç: "c", Ç: "c", ğ: "g", Ğ: "g",
};

export function slugify(input: string, maxLength = 120): string {
  const s = input
    .split("")
    .map((ch) => MAP[ch] ?? ch)
    .join("")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return s.slice(0, maxLength).replace(/-+$/g, "") || "qeyd";
}
