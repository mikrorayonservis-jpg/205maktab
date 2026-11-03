import { route, ok } from "@/lib/http";
import { schoolSummary } from "@/server/stats";

export const GET = route(async () => ok(await schoolSummary()), { permission: "reports.view" });
