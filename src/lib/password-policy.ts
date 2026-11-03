/**
 * Parol siyasəti — həm server (zod), həm brauzer (forma yoxlaması) eyni qaydanı istifadə edir.
 * Siyasət gizli deyil, ona görə NEXT_PUBLIC_ dəyişənləri ilə idarə olunur:
 *   NEXT_PUBLIC_PASSWORD_POLICY = "strong" (defolt) | "digits"
 *   NEXT_PUBLIC_PASSWORD_DIGITS = rəqəm sayı (digits rejimində, defolt 8)
 * "digits" yalnız test mərhələsi üçün nəzərdə tutulub: zəif parollardır. Parollar hər iki halda
 * Argon2id ilə hash-lənir; giriş cəhdləri rate limit və hesab bloku ilə məhdudlaşdırılır.
 */
import { z } from "zod";

export type PasswordPolicy = { mode: "strong" } | { mode: "digits"; length: number };

export function currentPasswordPolicy(): PasswordPolicy {
  if (process.env.NEXT_PUBLIC_PASSWORD_POLICY === "digits") {
    const n = Number(process.env.NEXT_PUBLIC_PASSWORD_DIGITS || 8);
    return { mode: "digits", length: Number.isInteger(n) && n >= 4 && n <= 32 ? n : 8 };
  }
  return { mode: "strong" };
}

export function passwordHint(p: PasswordPolicy = currentPasswordPolicy()): string {
  return p.mode === "digits" ? `Düz ${p.length} rəqəm (məsələn: ${"12345678901234567890".slice(0, p.length)}).` : "Ən azı 10 simvol, böyük və kiçik hərf, rəqəm.";
}

/** Parol sahəsi üçün HTML atributları (rəqəm rejimində mobil klaviatura rəqəmli olur). */
export function passwordInputProps(p: PasswordPolicy = currentPasswordPolicy()) {
  return p.mode === "digits" ? { inputMode: "numeric" as const, maxLength: p.length, pattern: "[0-9]{" + p.length + "}" } : { maxLength: 128 };
}

/** Brauzer üçün: xəta mesajı və ya null. */
export function checkPassword(value: string, p: PasswordPolicy = currentPasswordPolicy()): string | null {
  if (p.mode === "digits") {
    return new RegExp(`^\\d{${p.length}}$`).test(value) ? null : `Parol düz ${p.length} rəqəmdən ibarət olmalıdır.`;
  }
  if (value.length < 10) return "Parol ən azı 10 simvol olmalıdır.";
  if (value.length > 128) return "Parol çox uzundur.";
  if (!/[a-zəğıöşçü]/.test(value) || !/[A-ZƏĞİÖŞÇÜ]/.test(value)) return "Parolda böyük və kiçik hərf olmalıdır.";
  if (!/\d/.test(value)) return "Parolda ən azı bir rəqəm olmalıdır.";
  return null;
}

export function passwordSchemaFor(p: PasswordPolicy = currentPasswordPolicy()) {
  return z.string().superRefine((v, ctx) => {
    const msg = checkPassword(v, p);
    if (msg) ctx.addIssue({ code: z.ZodIssueCode.custom, message: msg });
  });
}
