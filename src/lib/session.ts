import type { SessionOptions } from "iron-session";

export const sessionCookieName = "ansara_session";

export type StaffSession = {
  userId?: string;
  isLoggedIn: boolean;
};

export function getSessionOptions(): SessionOptions {
  const password = process.env.SESSION_SECRET;
  if (!password || password.length < 32) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("SESSION_SECRET must be set and at least 32 characters");
    }
  }
  const pwd =
    password && password.length >= 32
      ? password
      : "dev-only-secret-min-32-chars-long!!";
  return {
    password: pwd,
    cookieName: sessionCookieName,
    cookieOptions: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 14,
      path: "/",
    },
  };
}
