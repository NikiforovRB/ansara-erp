import type { SessionOptions } from "iron-session";
import { getSessionOptions } from "@/lib/session";

export type LkPinSession = {
  verified?: boolean;
};

export function getLkSessionOptions(slug: string): SessionOptions {
  const base = getSessionOptions();
  return {
    ...base,
    cookieName: `ansara_lk_${slug}`,
    cookieOptions: {
      ...base.cookieOptions,
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    },
  };
}
