import "dotenv/config";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "../src/lib/db";
import { users } from "../src/lib/db/schema";

async function main() {
  const login = process.env.BOOTSTRAP_ADMIN_LOGIN ?? "admin";
  const password = process.env.BOOTSTRAP_ADMIN_PASSWORD;
  if (!password) {
    console.error("Set BOOTSTRAP_ADMIN_PASSWORD in .env");
    process.exit(1);
  }
  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.login, login))
    .limit(1);
  if (existing.length) {
    console.log("User already exists:", login);
    return;
  }
  const passwordHash = await bcrypt.hash(password, 10);
  await db.insert(users).values({
    login,
    passwordHash,
    firstName: "Админ",
    lastName: "Системы",
    role: "admin",
  });
  console.log("Created admin:", login);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
