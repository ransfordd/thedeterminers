import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { getCurrencyDisplay } from "@/lib/system-settings";
import { authOptions, resolveRole } from "@/lib/auth";
import { getClientsList } from "@/lib/dashboard/pages";
import { PageHeader, ModernCard, DataTable, AlertBanner } from "@/components/dashboard";
import { formatCurrencyFromGhs } from "@/lib/dashboard";
import { ClientActions } from "./ClientActions";

type ClientRow = {
  id: number;
  userId: number;
  username: string;
  firstName: string;
  lastName: string;
  email: string | null;
  clientCode: string;
  agentName: string | null;
  agentCode: string | null;
  dailyDepositAmount: number;
  status: string;
};

export default async function AdminClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; error?: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  const role = (session.user as { role?: string }).role;
  if (role !== "business_admin" && role !== "manager") redirect("/dashboard");


  const display = await getCurrencyDisplay();
  const params = await searchParams;
  const clients = await getClientsList();
  const backHref = role === "manager" ? "/manager" : "/admin";
  const columns = [
    { key: "id", header: "ID", render: (r: ClientRow) => <span className="font-mono text-gray-600 dark:text-gray-400">{r.id}</span> },
    { key: "username", header: "Username", render: (r: ClientRow) => <strong>{r.username}</strong> },
    { key: "name", header: "Name", render: (r: ClientRow) => `${r.firstName} ${r.lastName}` },
    { key: "email", header: "Email", render: (r: ClientRow) => r.email ?? "—" },
    { key: "clientCode", header: "Client Code", render: (r: ClientRow) => <code className="text-xs bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">{r.clientCode}</code> },
    { key: "agent", header: "Agent", render: (r: ClientRow) => r.agentName ? <><strong>{r.agentName}</strong><br /><small className="text-gray-500 dark:text-gray-400">{r.agentCode}</small></> : <span className="text-gray-500">No Agent</span> },
    { key: "dailyDepositAmount", header: "Daily Amount", render: (r: ClientRow) => <span className="font-medium text-green-700 dark:text-green-300">{formatCurrencyFromGhs(r.dailyDepositAmount, display)}</span> },
    { key: "status", header: "Status", render: (r: ClientRow) => <span className={`px-2 py-0.5 rounded text-xs font-medium ${r.status === "active" ? "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200" : "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200"}`}>{r.status}</span> },
    { key: "actions", header: "Actions", render: (r: ClientRow) => <ClientActions row={r} isAdmin={true} /> },
  ];

  return (
    <>
      <PageHeader
        title="Client Management"
        subtitle="Manage client accounts and information"
        icon={<i className="fas fa-users" />}
        backHref={backHref}
        primaryAction={{ href: "/admin/clients/new", label: "Add New Client" }}
        variant="primary"
      />
      {params.success && <AlertBanner type="success" message={params.success} icon={<i className="fas fa-check-circle" />} />}
      {params.error && <AlertBanner type="danger" message={params.error} icon={<i className="fas fa-exclamation-circle" />} />}
      <ModernCard
        title="All Clients"
        subtitle="Complete list of clients and their information"
        icon={<i className="fas fa-table" />}
      >
        <DataTable columns={columns} data={clients} emptyMessage="No clients yet." />
      </ModernCard>
    </>
  );
}
