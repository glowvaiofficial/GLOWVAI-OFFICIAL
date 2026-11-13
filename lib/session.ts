import { cookies } from "next/headers";
import { createSessionToken, verifySessionToken } from "./session-token";

export { SessionConfigError, createSessionToken, verifySessionToken } from "./session-token";

const SESSION_COOKIE_NAME = "gv_session";

export async function setSessionCookie(sessionId: string) {
  const token = createSessionToken(sessionId);
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 7200, // 2 hours
  });
  return token;
}

export async function getSessionFromCookie(): Promise<string | null> {
  const cookieStore = await cookies();
  const cookie = cookieStore.get(SESSION_COOKIE_NAME);
  if (!cookie?.value) return null;

  const result = verifySessionToken(cookie.value);
  return result.valid && result.sessionId ? result.sessionId : null;
}
