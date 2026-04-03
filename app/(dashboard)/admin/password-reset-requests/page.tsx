import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { PageHeader, ModernCard, DataTable } from "@/components/dashboard";
import { listPendingPasswordResetRequests } from "@/app/actions/password-reset";
import { PasswordResetActions } from "./PasswordResetActions";

export default async function AdminPasswordResetRequestsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  if ((session.user as { role?: string }).role !== "business_admin") redirect("/dashboard");

  const currentAdminId = parseInt((session.user as { id?: string }).id ?? "0", 10);
  const rows = await listPendingPasswordResetRequests();

  const tableRows = rows.map((r) => ({
    ...r,
    displayName: `${r.user.firstName ?? ""} ${r.user.lastName ?? ""}`.trim() || r.user.username,
    emailGate: r.emailVerifiedAt ? "Yes" : "—",
  }));

  const columns = [
    { key: "displayName", header: "Name" },
    {
      key: "usernameCol",
      header: "Username",
      render: (row: (typeof tableRows)[0]) => <span className="font-mono text-sm">{row.user.username}</span>,
    },
    {
      key: "roleCol",
      header: "Role",
      render: (row: (typeof tableRows)[0]) => <span className="capitalize">{row.user.role.replace("_", " ")}</span>,
    },
    { key: "emailGate", header: "Email verified" },
    {
      key: "createdAt",
      header: "Requested",
      render: (row: (typeof tableRows)[0]) => new Date(row.createdAt).toLocaleString("en-GB"),
    },
    {
      key: "expiresAt",
      header: "Expires",
      render: (row: (typeof tableRows)[0]) => new Date(row.expiresAt).toLocaleString("en-GB"),
    },
    {
      key: "id",
      header: "Actions",
      render: (row: (typeof tableRows)[0]) => (
        <PasswordResetActions requestId={row.id} targetUserId={row.user.id} currentAdminId={currentAdminId} />
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Password reset requests"
        subtitle="Approve or reject staff password resets (managers and business admins). SMS is sent after approval."
        icon={<i className="fas fa-key" />}
        backHref="/admin"
        variant="purple"
      />
      <ModernCard
        title="Pending approval"
        subtitle="Approving sends a one-time SMS code to the requester’s phone on file."
        icon={<i className="fas fa-inbox" />}
      >
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          You cannot approve your own request. If your organization has only one business admin, use break-glass (e.g.
          set password via a secure DB or tooling process, or add a second admin) — the queue cannot self-approve.
        </p>
        <DataTable columns={columns} data={tableRows} emptyMessage="No pending password reset requests." />
      </ModernCard>
    </>
  );
}
