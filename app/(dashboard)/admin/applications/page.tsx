import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { getLoanApplicationsList } from "@/lib/dashboard/pages";
import { PageHeader, ModernCard, DataTable } from "@/components/dashboard";
import { formatCurrency } from "@/lib/dashboard";

export default async function AdminApplicationsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  const role = (session.user as { role?: string }).role;
  if (role !== "business_admin" && role !== "manager") redirect("/dashboard");

  const applications = await getLoanApplicationsList();
  const backHref = role === "manager" ? "/manager" : "/admin";
  const columns = [
    { key: "applicationNumber", header: "Application #", render: (r: { applicationNumber: string }) => <code className="text-xs bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">{r.applicationNumber}</code> },
    { key: "clientName", header: "Client" },
    { key: "productName", header: "Product" },
    { key: "requestedAmount", header: "Amount", render: (r: { requestedAmount: number }) => formatCurrency(r.requestedAmount) },
    { key: "requestedTermMonths", header: "Term", render: (r: { requestedTermMonths: number }) => `${r.requestedTermMonths} months` },
    { key: "applicationStatus", header: "Status", render: (r: { applicationStatus: string }) => <span className={`px-2 py-0.5 rounded text-xs font-medium ${r.applicationStatus === "approved" ? "bg-green-100 text-green-800 dark:bg-green-900/40" : r.applicationStatus === "pending" ? "bg-amber-100 text-amber-800 dark:bg-amber-900/40" : "bg-red-100 text-red-800 dark:bg-red-900/40"}`}>{r.applicationStatus}</span> },
    { key: "appliedDate", header: "Applied", render: (r: { appliedDate: Date }) => new Date(r.appliedDate).toLocaleDateString("en-GB") },
  ];

  return (
    <>
      <PageHeader
        title="Loan Applications"
        subtitle="Review and process loan applications"
        icon={<i className="fas fa-file-alt" />}
        backHref={backHref}
        variant="orange"
      />
      <ModernCard
        title="All Applications"
        subtitle="Loan applications awaiting review or completed"
        icon={<i className="fas fa-table" />}
      >
        <DataTable columns={columns} data={applications} emptyMessage="No loan applications yet." />
      </ModernCard>
    </>
  );
}
