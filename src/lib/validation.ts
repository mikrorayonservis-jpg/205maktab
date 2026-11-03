/** Ortaq zod sxemləri və köməkçilər (Azərbaycan dilində xəta mesajları). */
import { z } from "zod";

z.setErrorMap((issue, ctx) => {
  switch (issue.code) {
    case z.ZodIssueCode.invalid_type:
      if (issue.received === "undefined" || issue.received === "null") return { message: "Bu sahə tələb olunur." };
      return { message: "Dəyərin formatı yanlışdır." };
    case z.ZodIssueCode.too_small:
      if (issue.type === "string") return { message: issue.minimum === 1 ? "Bu sahə tələb olunur." : `Ən azı ${issue.minimum} simvol olmalıdır.` };
      if (issue.type === "array") return { message: `Ən azı ${issue.minimum} element seçilməlidir.` };
      return { message: `Dəyər ${issue.minimum}-dən kiçik ola bilməz.` };
    case z.ZodIssueCode.too_big:
      if (issue.type === "string") return { message: `Ən çoxu ${issue.maximum} simvol ola bilər.` };
      return { message: `Dəyər ${issue.maximum}-dən böyük ola bilməz.` };
    case z.ZodIssueCode.invalid_enum_value:
      return { message: "Seçim yanlışdır." };
    case z.ZodIssueCode.invalid_string:
      if (issue.validation === "email") return { message: "E-poçt ünvanı düzgün deyil." };
      if (issue.validation === "url") return { message: "Keçid düzgün deyil." };
      return { message: "Format yanlışdır." };
    default:
      return { message: ctx.defaultError };
  }
});

export { z };

export const id = z.coerce.number().int().positive();
export const optionalId = z.preprocess((v) => (v === "" || v === null || v === undefined ? null : v), z.coerce.number().int().positive().nullable());
export const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Tarix YYYY-MM-DD formatında olmalıdır.");
export const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/, "Saat SS:DD formatında olmalıdır.");
export const email = z.string().trim().toLowerCase().email().max(190);
export const shortText = (max = 255) => z.string().trim().min(1).max(max);
export const optionalText = (max = 255) =>
  z.preprocess((v) => (typeof v === "string" && v.trim() === "" ? null : v), z.string().trim().max(max).nullable().optional());

export const pageQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  q: z.string().trim().max(100).optional(),
});

export function paging(page: number, pageSize: number) {
  return { limit: pageSize, offset: (page - 1) * pageSize };
}
