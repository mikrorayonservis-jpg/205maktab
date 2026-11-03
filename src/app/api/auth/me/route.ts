import { route, ok } from "@/lib/http";

export const GET = route(async ({ user }) => {
  if (!user) return ok({ user: null });
  return ok({
    user: {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      roles: user.roles,
      permissions: [...user.permissions],
      emailVerified: user.emailVerified,
    },
  });
});
