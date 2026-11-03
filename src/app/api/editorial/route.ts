import { route, ok, readJson, parseQuery } from "@/lib/http";
import { z } from "@/lib/validation";
import { articleSchema, createArticle, editorialList } from "@/server/news";

export const GET = route(
  async ({ req, user }) => {
    const q = parseQuery(
      req,
      z.object({
        scope: z.enum(["mine", "queue", "all"]).default("mine"),
        status: z.enum(["draft", "pending", "approved", "published", "archived"]).optional(),
        q: z.string().trim().max(100).optional(),
        page: z.coerce.number().int().min(1).default(1),
      })
    );
    return ok(await editorialList(user!, { scope: q.scope, status: q.status, search: q.q, page: q.page }));
  },
  { permission: ["news.submit", "news.review", "news.edit_any", "news.publish"] }
);

export const POST = route(async ({ req, user }) => ok(await createArticle(user!, await readJson(req, articleSchema), req), { status: 201 }), {
  permission: "news.submit",
});
