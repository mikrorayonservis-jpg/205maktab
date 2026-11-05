// Qeydiyyat formasının yeganə yoxlama sxemi: həm server (/api/auth/register), həm brauzer istifadə edir.
// Əvvəl brauzer daha yumşaq yoxlayırdı (məs. "əli@mail.az" keçirdi), server isə 422 qaytarırdı.
import { z, email, shortText } from "./validation";
import { passwordSchemaFor } from "./password-policy";

export const registerSchema = z
  .object({
    code: z.string().trim().min(4, "Dəvət kodunu daxil edin.").max(40),
    // Əvvəl aydın səbəb (ə, ş, ı kimi hərflər), sonra ümumi e-poçt formatı
    email: z
      .string()
      .trim()
      .min(1, "E-poçt ünvanını yazın.")
      .refine((v) => /^[\x21-\x7e]*$/.test(v), "E-poçtda yalnız latın hərfləri (a–z), rəqəmlər və . _ - @ ola bilər.")
      .pipe(email),
    firstName: shortText(100),
    lastName: shortText(100),
    password: passwordSchemaFor(),
    passwordConfirm: z.string(),
  })
  .refine((v) => v.password === v.passwordConfirm, { message: "Parollar uyğun gəlmir.", path: ["passwordConfirm"] });

export type RegisterInput = z.infer<typeof registerSchema>;

/** zod xətalarını sahə → mesaj xəritəsinə çevirir (serverin `fail()` funksiyası ilə eyni forma) */
export function fieldErrors(err: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of err.issues) {
    const key = issue.path.join(".") || "_";
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}
