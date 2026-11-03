import { route, ok, readJson } from "@/lib/http";
import { id } from "@/lib/validation";
import { transitionArticle, transitionSchema } from "@/server/news";

export const POST = route<{ id: string }>(
  async ({ req, user, params }) => {
    const body = await readJson(req, transitionSchema);
    return ok(await transitionArticle(user!, id.parse(params.id), body.action, body.note, req));
  },
  { permission: ["news.submit", "news.review", "news.edit_any", "news.publish"] }
);
