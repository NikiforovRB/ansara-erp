import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { toHeaderUser } from "@/lib/header-user";
import { DashboardApp } from "./dashboard-app";

export default async function HomePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return <DashboardApp user={toHeaderUser(user)} />;
}
