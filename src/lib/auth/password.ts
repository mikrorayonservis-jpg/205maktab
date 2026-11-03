/**
 * Parol hash-ləmə (Argon2id, OWASP tövsiyəsi: m=19 MiB, t=2, p=1) və parol siyasəti.
 */
import "server-only";
import { hash, verify } from "@node-rs/argon2";
import { z } from "zod";

const ARGON2ID = 2;
const OPTIONS = { algorithm: ARGON2ID, memoryCost: 19456, timeCost: 2, parallelism: 1 } as const;

export async function hashPassword(password: string): Promise<string> {
  return hash(password, OPTIONS as never);
}

export async function verifyPassword(stored: string, password: string): Promise<boolean> {
  if (!stored || !stored.startsWith("$argon2")) return false;
  try {
    return await verify(stored, password);
  } catch {
    return false;
  }
}

/** Zaman hücumlarına qarşı: istifadəçi yoxdursa da hash hesablanır. */
let dummyHash: string | null = null;
export async function fakeVerify(password: string): Promise<void> {
  if (!dummyHash) dummyHash = await hashPassword("q205-timing-equalizer-not-a-password");
  await verifyPassword(dummyHash, password);
}

export const passwordSchema = z
  .string()
  .min(10, "Parol ən azı 10 simvol olmalıdır.")
  .max(128, "Parol çox uzundur.")
  .refine((p) => /[a-zəğıöşçü]/.test(p) && /[A-ZƏĞİÖŞÇÜ]/.test(p), "Parolda böyük və kiçik hərf olmalıdır.")
  .refine((p) => /\d/.test(p), "Parolda ən azı bir rəqəm olmalıdır.");
