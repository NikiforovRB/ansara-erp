import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { getSessionOptions, type StaffSession } from "@/lib/session";

export async function POST() {
  const session = await getIronSession<StaffSession>(
    await cookies(),
    getSessionOptions(),
  );
  session.destroy();
  return Response.json({ ok: true });
}
