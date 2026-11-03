import { route, ok, readJson } from "@/lib/http";
import { bulkPublishQueue, bulkPublishSchema } from "@/server/news";

/** Yoxlama növbəsini toplu dərc etmək (valideyn razılığının açıq təsdiqi ilə). */
export const POST = route(
  async ({ req, user }) => {
    const body = await readJson(req, bulkPublishSchema);
    return ok(await bulkPublishQueue(user!, body, req));
  },
  { permission: "news.publish" }
);
