import { route, ok, readJson } from "@/lib/http";
import { audit } from "@/lib/audit";
import { z, shortText, optionalText } from "@/lib/validation";
import { notifyRoles } from "@/server/notifications";

export const POST = route(
  async ({ req, user }) => {
    const body = await readJson(
      req,
      z.object({
        title: shortText(255),
        message: optionalText(2000),
        audience: z.enum(["all", "students", "parents", "teachers", "staff"]),
        link: z.preprocess((v) => (v === "" ? undefined : v), z.string().regex(/^\/[^\s]*$/, "Yalnız saytdaxili keçid (/ ilə başlayan).").optional()),
      })
    );
    const map = {
      all: "all" as const,
      students: ["student"],
      parents: ["parent"],
      teachers: ["teacher", "class_teacher"],
      staff: ["super_admin", "school_admin", "director", "deputy_director", "teacher", "class_teacher", "chief_editor", "editor", "author", "photographer"],
    };
    await notifyRoles(map[body.audience], { title: body.title, message: body.message ?? undefined, type: "system", link: body.link });
    await audit({ userId: user!.id, action: "notification.broadcast", entityType: "notification", newValues: body, req });
    return ok({ sent: true });
  },
  { permission: "notifications.broadcast" }
);
