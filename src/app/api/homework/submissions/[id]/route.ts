import { route, ok, readJson } from "@/lib/http";
import { id } from "@/lib/validation";
import { gradeSubmission, gradeSubmissionSchema } from "@/server/homework";

export const PATCH = route<{ id: string }>(
  async ({ req, user, params }) => {
    await gradeSubmission(user!, id.parse(params.id), await readJson(req, gradeSubmissionSchema), req);
    return ok({ updated: true });
  },
  { auth: true }
);
