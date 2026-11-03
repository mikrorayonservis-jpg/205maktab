import { route, ok } from "@/lib/http";
import { clearSessionCookie, revokeSessionByToken, SESSION_COOKIE } from "@/lib/auth/session";

export const POST = route(async ({ req }) => {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (token) await revokeSessionByToken(token);
  const res = ok({ loggedOut: true });
  clearSessionCookie(res);
  return res;
});
