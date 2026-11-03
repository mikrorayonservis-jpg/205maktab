import { route, ok, readJson, Errors } from "@/lib/http";
import { z } from "@/lib/validation";
import { enforce } from "@/lib/rate-limit";
import { canUseOfficialJournal, recordOpen } from "@/server/official-journal";

/** Yalnız "bu saytdan rəsmi jurnala keçid edildi" faktını qeyd edir. Rəsmi sistemlə əlaqə qurmur. */
export const POST = route(
  async ({ req, user }) => {
    if (!canUseOfficialJournal(user)) throw Errors.forbidden();
    await enforce(`ojopen:${user!.id}`, 60, 3600);
    const { target } = await readJson(req, z.object({ target: z.enum(["jurnal", "digital"]) }));
    await recordOpen(user!, target, req);
    return ok({ recorded: true });
  },
  { auth: true }
);
