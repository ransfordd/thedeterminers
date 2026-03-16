import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions, resolveRole } from "@/lib/auth";
import { getLoanProducts } from "@/lib/dashboard/pages";
import { PageHeader, ModernCard, DataTable } from "@/components/dashboard";
import { formatCurrency } from "@/lib/dashboard";

export default async function AdminProductsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  const role = await resolveRole(session);
  const allowed = role === "business_admin" || role === "manager" || role === "";
  if (!allowed) redirect("/dashboard");
  const effectiveRole = role || "manager";

  const products = await getLoanProducts();
  const columns = [
    { key: "id", header: "ID", render: (r: { id: number }) => <span className="font-mono text-gray-600 dark:text-gray-400">{r.id}</span> },
    { key: "productName", header: "Product Name", render: (r: { productName: string }) => <strong>{r.productName}</strong> },
    { key: "productCode", header: "Code", render: (r: { productCode: string }) => <code className="text-xs bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">{r.productCode}</code> },
    { key: "interestRate", header: "Interest Rate", render: (r: { interestRate: number }) => `${r.interestRate}%` },
    { key: "interestType", header: "Type", render: (r: { interestType: string }) => <span className="capitalize">{r.interestType.replace("_", " ")}</span> },
    { key: "range", header: "Amount Range", render: (r: { minAmount: number; maxAmount: number }) => `${formatCurrency(r.minAmount)} - ${formatCurrency(r.maxAmount)}` },
    { key: "terms", header: "Terms", render: (r: { minTermMonths: number; maxTermMonths: number }) => `${r.minTermMonths} - ${r.maxTermMonths} months` },
    { key: "status", header: "Status", render: (r: { status: string }) => <span className={`px-2 py-0.5 rounded text-xs font-medium ${r.status === "active" ? "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200" : "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200"}`}>{r.status}</span> },
  ];

  const backHref = effectiveRole === "manager" ? "/manager" : "/admin";
  return (
    <>
      <PageHeader
        title="Loan Products Management"
        subtitle="Manage loan products and interest rates"
        icon={<i className="fas fa-box" />}
        backHref={backHref}
        primaryAction={effectiveRole === "business_admin" ? { href: "/admin/products/new", label: "New Product" } : undefined}
        variant="orange"
      />
      <ModernCard
        title="All Loan Products"
        subtitle="Complete list of available loan products"
        icon={<i className="fas fa-table" />}
      >
        <DataTable columns={columns} data={products} emptyMessage="No loan products yet. Add one to get started." />
      </ModernCard>
    </>
  );
}
