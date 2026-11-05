/**
 * Parol siyasəti — həm server (zod), həm brauzer (forma yoxlaması) eyni qaydanı istifadə edir.
 * Siyasət gizli deyil, ona görə NEXT_PUBLIC_PASSWORD_POLICY ilə idarə olunur (build zamanı oxunur):
 *   "standard" (defolt) — ən azı 8 simvol; hərf, rəqəm və işarələrin istənilən birləşməsi (NIST SP 800-63B
 *                         yanaşması: uzunluq + çox yayılmış parolların rəddi, məcburi tərkib qaydası yoxdur)
 *   "strong"            — ən azı 10 simvol, böyük və kiçik hərf, rəqəm
 * Köhnə "digits" dəyəri (yalnız rəqəmli test rejimi) artıq dəstəklənmir və "standard" kimi işləyir:
 * həmin rejim parolda hərfə icazə vermirdi. Mövcud parollar dəyişmir — siyasət yalnız yeni parol təyin edərkən yoxlanılır.
 * Parollar hər iki halda Argon2id ilə hash-lənir; giriş cəhdləri rate limit və hesab bloku ilə məhdudlaşdırılır.
 */
import { z } from "zod";

export type PasswordPolicy = { mode: "standard" } | { mode: "strong" };

export const PASSWORD_MAX = 128;

export function currentPasswordPolicy(): PasswordPolicy {
  return process.env.NEXT_PUBLIC_PASSWORD_POLICY === "strong" ? { mode: "strong" } : { mode: "standard" };
}

export function passwordHint(p: PasswordPolicy = currentPasswordPolicy()): string {
  return p.mode === "strong" ? "Ən azı 10 simvol, böyük və kiçik hərf, rəqəm." : "Ən azı 8 simvol. Hərf, rəqəm və işarələrdən istifadə edə bilərsiniz.";
}

/** Parol sahəsi üçün HTML atributları (klaviatura məhdudlaşdırılmır). */
export function passwordInputProps() {
  return { maxLength: PASSWORD_MAX };
}

// Ən çox sızdırılmış/təxmin edilən parollar (kiçik hərflə müqayisə olunur)
const COMMON = new Set([
  "12345678", "123456789", "1234567890", "87654321", "11111111", "00000000", "12341234", "11223344",
  "password", "password1", "qwertyui", "qwerty123", "1q2w3e4r", "1qaz2wsx", "asdfghjk", "zxcvbnm1", "iloveyou",
  "abcd1234", "abc12345", "parol123", "salam123", "azerbaycan", "mekteb205", "205mekteb",
]);

/** Brauzer üçün: xəta mesajı və ya null. */
export function checkPassword(value: string, p: PasswordPolicy = currentPasswordPolicy()): string | null {
  if (value.length > PASSWORD_MAX) return "Parol çox uzundur.";
  if (p.mode === "strong") {
    if (value.length < 10) return "Parol ən azı 10 simvol olmalıdır.";
    if (!/[a-zəğıöşçü]/.test(value) || !/[A-ZƏĞİÖŞÇÜ]/.test(value)) return "Parolda böyük və kiçik hərf olmalıdır.";
    if (!/\d/.test(value)) return "Parolda ən azı bir rəqəm olmalıdır.";
    return null;
  }
  if (value.length < 8) return "Parol ən azı 8 simvol olmalıdır.";
  if (!value.trim()) return "Parol yalnız boşluqdan ibarət ola bilməz.";
  if (/^(.)\1+$/.test(value)) return "Parol eyni simvolun təkrarından ibarət ola bilməz.";
  if (COMMON.has(value.toLowerCase())) return "Bu parol çox geniş yayılıb. Başqa parol seçin.";
  return null;
}

export function passwordSchemaFor(p: PasswordPolicy = currentPasswordPolicy()) {
  return z.string().superRefine((v, ctx) => {
    const msg = checkPassword(v, p);
    if (msg) ctx.addIssue({ code: z.ZodIssueCode.custom, message: msg });
  });
}
