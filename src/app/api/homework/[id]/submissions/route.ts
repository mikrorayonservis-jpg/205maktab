import { route, ok, readJson } from "@/lib/http";
import { id } from "@/lib/validation";
import { listSubmissions, submissionSchema, submitHomework } from "@/server/homework";

type P = { id: string };

export const GET = route<P>(async ({ user, params }) => ok(await listSubmissions(user!, id.parse(params.id))), { auth: true });

export const POST = route<P>(
  async ({ req, user, params }) => {
    await submitHomework(user!, id.parse(params.id), await readJson(req, submissionSchema), req);
    return ok({ submitted: true }, { status: 201 });
  },
  { auth: true }
);
