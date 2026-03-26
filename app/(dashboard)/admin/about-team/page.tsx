import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/dashboard";
import { AboutTeamClient } from "./AboutTeamClient";

export default async function AdminAboutTeamPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  const role = (session.user as { role?: string }).role;
  if (role !== "business_admin" && role !== "manager") redirect("/dashboard");

  const members = await prisma.aboutTeamMember.findMany({
    orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
  });

  const backHref = role === "manager" ? "/manager" : "/admin";

  return (
    <>
      <PageHeader
        title="About page — team"
        subtitle="Manage Meet Our Team on the public About page"
        icon={<i className="fas fa-users" />}
        backHref={backHref}
        variant="purple"
      />
      <AboutTeamClient members={members} />
    </>
  );
}
