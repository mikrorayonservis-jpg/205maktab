import { route, ok, parseQuery } from "@/lib/http";
import { z } from "@/lib/validation";
import { publishedNews } from "@/server/news";

/** İctimai xəbər lenti (yalnız dərc edilmiş məqalələr). */
export const GET = route(async ({ req }) => {
  const q = parseQuery(
    req,
    z.object({
      category: z.string().regex(/^[a-z0-9-]{1,190}$/).optional(),
      q: z.string().trim().max(100).optional(),
      year: z.coerce.number().int().min(2000).max(2100).optional(),
      page: z.coerce.number().int().min(1).max(1000).default(1),
    })
  );
  return ok(await publishedNews({ category: q.category, q: q.q, year: q.year, page: q.page }));
});
