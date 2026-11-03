import { route, readJson, ok } from "@/lib/http";
import { z } from "@/lib/validation";
import { enforce } from "@/lib/rate-limit";
import { redeemInvitation } from "@/server/accounts";

export const POST = route(
  async ({ req, user }) => {
    await enforce(`redeem:${user!.id}`, 10, 3600);
    const { code } = await readJson(req, z.object({ code: z.string().trim().min(12).max(20) }));
    await redeemInvitation(user!, code);
    return ok({ message: "Uşaq hesabınıza əlavə edildi." });
  },
  { auth: true }
);
