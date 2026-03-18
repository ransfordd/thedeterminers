import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { getLoanApplicationsList } from "@/lib/dashboard/pages";
import { PageHeader, ModernCard, DataTable } from "@/components/dashboard";
import { formatCurrencyFromGhs } from "@/lib/dashboard";
import { getCurrencyDisplay } from "@/lib/system-settings";

type AppRow = { id: number; applicationNumber: string; clientName: string; productName: string; requestedAmount: number; requestedTermMonths: number; applicationStatus: string; appliedDate: Date };

export default async function AdminApplicationsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  const role = (session.user as { role?: string }).role;
  if (role !== "business_admin" && role !== "manager") redirect("/dashboard");

  const [applications, display] = await Promise.all([getLoanApplicationsList(), getCurrencyDisplay()]);
  const backHref = role === "manager" ? "/manager" : "/admin";
  const columns = [
    { key: "applicationNumber", header: "Application #", render: (r: AppRow) => <code className="text-xs bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">{r.applicationNumber}</code> },
    { key: "clientName", header: "Client" },
    { key: "productName", header: "Product" },
    { key: "requestedAmount", header: "Amount", render: (r: AppRow) => formatCurrencyFromGhs(r.requestedAmount, display) },
    { key: "requestedTermMonths", header: "Term", render: (r: AppRow) => `${r.requestedTermMonths} months` },
    { key: "applicationStatus", header: "Status", render: (r: AppRow) => <span className={`px-2 py-0.5 rounded text-xs font-medium ${r.applicationStatus === "approved" ? "bg-green-100 text-green-800 dark:bg-green-900/40" : r.applicationStatus === "pending" || r.applicationStatus === "under_review" ? "bg-amber-100 text-amber-800 dark:bg-amber-900/40" : "bg-red-100 text-red-800 dark:bg-red-900/40"}`}>{r.applicationStatus}</span> },
    { key: "appliedDate", header: "Applied", render: (r: AppRow) => new Date(r.appliedDate).toLocaleDateString("en-GB") },
    { key: "actions", header: "Actions", render: (r: AppRow) => <Link href={`/admin/applications/${r.id}`} className="text-indigo-600 dark:text-indigo-400 hover:underline font-medium">View</Link> },
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
