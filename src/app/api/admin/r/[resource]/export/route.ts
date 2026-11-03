import { route } from "@/lib/http";
import { audit } from "@/lib/audit";
import { resourceFor } from "@/server/admin-guard";
import { exportResource, toCsv } from "@/server/admin-crud";

export const GET = route<{ resource: string }>(
  async ({ req, user, params }) => {
    const def = resourceFor(user, params.resource);
    const sp = req.nextUrl.searchParams;
    const filters: Record<string, string> = {};
    sp.forEach((v, k) => {
      if (k.startsWith("f_")) filters[k.slice(2)] = v;
    });
    const rows = await exportResource(def, { q: (sp.get("q") || "").slice(0, 100), filters });
    await audit({ userId: user!.id, action: `${def.key}.export`, entityType: def.table, newValues: { count: rows.length }, req });
    return new Response(toCsv(def, rows), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${def.key}-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  },
  { permission: "admin.access" }
);
