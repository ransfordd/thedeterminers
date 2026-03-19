import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { PageHeader, ModernCard } from "@/components/dashboard";
import { NewStaffUserForm } from "./NewStaffUserForm";

export default async function NewStaffUserPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  if ((session.user as { role?: string }).role !== "business_admin") redirect("/dashboard");

  return (
    <>
      <PageHeader
        title="Create User"
        subtitle="Create a manager or agent account"
        icon={<i className="fas fa-user-plus" />}
        backHref="/admin/users"
        variant="primary"
      />
      <ModernCard
        title="User Information"
        subtitle="Set role and account details"
        icon={<i className="fas fa-id-badge" />}
      >
        <NewStaffUserForm />
      </ModernCard>
    </>
  );
}
