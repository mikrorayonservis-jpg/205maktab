import { route, ok, readJson } from "@/lib/http";
import { z } from "@/lib/validation";
import { importStudents } from "@/server/classes";

/** CSV import: apply=false → yalnız yoxlama (preview); apply=true → hamısı bir tranzaksiyada */
export const POST = route(
  async ({ req, user }) => {
    const body = await readJson(req, z.object({ csv: z.string().min(1, "Fayl boşdur.").max(2_000_000, "Fayl çox böyükdür (2 MB-a qədər)."), apply: z.boolean().default(false) }));
    return ok(await importStudents(user!, body.csv, body.apply, req));
  },
  { permission: "students.enroll" }
);
