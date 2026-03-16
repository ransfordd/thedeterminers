import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { PageHeader, ModernCard } from "@/components/dashboard";
import { ChangePasswordForm } from "./ChangePasswordForm";

export default async function ChangePasswordPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Change Password"
        subtitle="Update your account password securely"
        icon={<i className="fas fa-key" />}
      />
      <ModernCard
        title="Password security"
        subtitle="Keep your account secure with a strong password"
        icon={<i className="fas fa-shield-alt" />}
      >
        <ChangePasswordForm />
      </ModernCard>
    </div>
  );
}
