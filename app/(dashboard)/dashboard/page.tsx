import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";

const roleRedirect: Record<string, string> = {
  business_admin: "/admin",
  manager: "/manager",
  agent: "/agent",
  client: "/client",
};

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  const role = (session.user as { role?: string }).role ?? "";
  const target = roleRedirect[role] ?? "/admin";
  redirect(target);
}
