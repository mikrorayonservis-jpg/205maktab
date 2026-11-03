import { route, ok, readJson, Errors } from "@/lib/http";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { z } from "@/lib/validation";
import { PAGE_SLUGS } from "@/server/settings";

type P = { slug: string };

export const GET = route<P>(
  async ({ params }) => {
    if (!(params.slug in PAGE_SLUGS)) throw Errors.notFound("Səhifə");
    return ok((await db.queryOne("SELECT slug, title_az, content_md, updated_at FROM pages WHERE slug = ?", [params.slug])) ?? { slug: params.slug, title_az: PAGE_SLUGS[params.slug], content_md: "" });
  },
  { permission: "content.manage" }
);

export const PUT = route<P>(
  async ({ req, user, params }) => {
    if (!(params.slug in PAGE_SLUGS)) throw Errors.notFound("Səhifə");
    const body = await readJson(req, z.object({ title: z.string().trim().min(1).max(255), content: z.string().max(200000) }));
    await db.execute(
      `INSERT INTO pages (slug, title_az, content_md, updated_by) VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE title_az = VALUES(title_az), content_md = VALUES(content_md), updated_by = VALUES(updated_by)`,
      [params.slug, body.title, body.content, user!.id]
    );
    await audit({ userId: user!.id, action: "page.update", entityType: "page", newValues: { slug: params.slug, title: body.title }, req });
    return ok({ saved: true });
  },
  { permission: "content.manage" }
);
