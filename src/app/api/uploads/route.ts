import { route, ok, Errors } from "@/lib/http";
import { can, type Permission } from "@/lib/auth/permissions";
import { enforce } from "@/lib/rate-limit";
import { storeUpload, type FileKind, type Visibility } from "@/lib/storage";

/** Yükləmə təyinatları: hər biri üçün icazə, fayl növləri və görünürlük. */
const PURPOSES: Record<string, { perms: Permission[] | "student" | "staff_teacher"; kinds: FileKind[]; visibility: Visibility; maxWidth?: number }> = {
  news: { perms: ["media.upload"], kinds: ["image"], visibility: "public" },
  gallery: { perms: ["gallery.manage", "media.upload"], kinds: ["image"], visibility: "public" },
  event: { perms: ["events.manage"], kinds: ["image"], visibility: "public" },
  document: { perms: ["documents.manage"], kinds: ["pdf"], visibility: "public" },
  avatar: { perms: ["teachers.manage", "content.manage"], kinds: ["image"], visibility: "public", maxWidth: 800 },
  content: { perms: ["content.manage"], kinds: ["image"], visibility: "public" },
  homework: { perms: "staff_teacher", kinds: ["pdf", "image", "document"], visibility: "private" },
  submission: { perms: "student", kinds: ["pdf", "image", "document"], visibility: "private" },
};

export const POST = route(
  async ({ req, user }) => {
    const u = user!;
    await enforce(`upload:${u.id}`, 60, 3600, "Çox sayda fayl yükləndi. Bir saat sonra yenidən cəhd edin.");
    const len = Number(req.headers.get("content-length") || 0);
    if (len > 16 * 1024 * 1024) throw Errors.badRequest("Fayl çox böyükdür.");
    const form = await req.formData().catch(() => {
      throw Errors.badRequest("Forma məlumatı oxunmadı.");
    });
    const purpose = String(form.get("purpose") || "");
    const cfg = PURPOSES[purpose];
    if (!cfg) throw Errors.badRequest("Yükləmə təyinatı yanlışdır.");
    const allowed =
      cfg.perms === "student" ? Boolean(u.studentId)
      : cfg.perms === "staff_teacher" ? Boolean(u.teacherId) || can(u, "school.manage")
      : cfg.perms.some((p) => can(u, p));
    if (!allowed) throw Errors.forbidden();
    const file = form.get("file");
    if (!(file instanceof File)) throw Errors.badRequest("Fayl seçilməyib.");
    const stored = await storeUpload(file, { allowed: cfg.kinds, visibility: cfg.visibility, purpose, ownerUserId: u.id, maxImageWidth: cfg.maxWidth });
    return ok(stored, { status: 201 });
  },
  { auth: true }
);
