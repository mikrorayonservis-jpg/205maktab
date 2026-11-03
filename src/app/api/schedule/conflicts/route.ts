import { route, ok } from "@/lib/http";
import { allConflicts } from "@/server/schedule";

export const GET = route(async () => ok(await allConflicts()), { permission: ["schedule.manage", "schedule.view_all"] });
