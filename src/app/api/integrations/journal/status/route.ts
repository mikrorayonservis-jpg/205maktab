import { route, ok, Errors } from "@/lib/http";
import { canUseOfficialJournal, lastOpened } from "@/server/official-journal";
import { CAPABILITIES } from "@/server/integrations/official-journal-capabilities";

/**
 * Rəsmi jurnal inteqrasiyasının dürüst vəziyyəti. Hər sahə ayrıca texniki faktdır:
 * yerli sessiya ≠ rəsmi identifikasiya ≠ rəsmi portalın açılması ≠ API icazəsi ≠ sinxronizasiya.
 */
export const GET = route(
  async ({ user }) => {
    if (!canUseOfficialJournal(user)) throw Errors.forbidden();
    const last = await lastOpened(user!.id);
    return ok({
      localSession: { authenticated: true },
      identityProvider: { verified: false, provider: null },
      portal: { lastOpenedFromThisSite: last?.at ?? null, target: last?.target ?? null },
      officialApi: { authorized: false },
      sync: { lastSuccessAt: null, pending: 0, failed: false, supported: false },
      capabilities: CAPABILITIES.map(({ key, phase, title, enabled, verification, statusText, requirement, checkedOn }) => ({
        key, phase, title, enabled, verification, statusText, requirement, checkedOn,
      })),
    });
  },
  { auth: true }
);
