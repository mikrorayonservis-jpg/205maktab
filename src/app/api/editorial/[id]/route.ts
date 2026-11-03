import { route, ok, readJson } from "@/lib/http";
import { id } from "@/lib/validation";
import { articleSchema, deleteArticle, editorialGet, updateArticle } from "@/server/news";

type P = { id: string };
const perms = ["news.submit", "news.review", "news.edit_any", "news.publish"] as const;

export const GET = route<P>(async ({ user, params }) => ok(await editorialGet(user!, id.parse(params.id))), { permission: [...perms] });

export const PUT = route<P>(async ({ req, user, params }) => ok(await updateArticle(user!, id.parse(params.id), await readJson(req, articleSchema), req)), {
  permission: [...perms],
});

export const DELETE = route<P>(
  async ({ req, user, params }) => {
    await deleteArticle(user!, id.parse(params.id), req);
    return ok({ deleted: true });
  },
  { permission: [...perms] }
);
