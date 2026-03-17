import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions, resolveRole } from "@/lib/auth";
import { getLoanProducts } from "@/lib/dashboard/pages";
import { PageHeader, ModernCard, DataTable } from "@/components/dashboard";
import { formatCurrency } from "@/lib/dashboard";
import { getCurrency } from "@/lib/system-settings";

type ProductRow = { id: number; productName: string; productCode: string; interestRate: number; interestType: string; minAmount: number; maxAmount: number; minTermMonths: number; maxTermMonths: number; status: string };

export default async function AdminProductsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  const role = await resolveRole(session);
  const allowed = role === "business_admin" || role === "manager" || role === "";
  if (!allowed) redirect("/dashboard");
  const effectiveRole = role || "manager";

  const [products, currency] = await Promise.all([getLoanProducts(), getCurrency()]);
  const columns = [
    { key: "id", header: "ID", render: (r: ProductRow) => <span className="font-mono text-gray-600 dark:text-gray-400">{r.id}</span> },
    { key: "productName", header: "Product Name", render: (r: ProductRow) => <strong>{r.productName}</strong> },
    { key: "productCode", header: "Code", render: (r: ProductRow) => <code className="text-xs bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">{r.productCode}</code> },
    { key: "interestRate", header: "Interest Rate", render: (r: ProductRow) => `${r.interestRate}%` },
    { key: "interestType", header: "Type", render: (r: ProductRow) => <span className="capitalize">{r.interestType.replace("_", " ")}</span> },
    { key: "range", header: "Amount Range", render: (r: ProductRow) => `${formatCurrency(r.minAmount, currency)} - ${formatCurrency(r.maxAmount, currency)}` },
    { key: "terms", header: "Terms", render: (r: ProductRow) => `${r.minTermMonths} - ${r.maxTermMonths} months` },
    { key: "status", header: "Status", render: (r: ProductRow) => <span className={`px-2 py-0.5 rounded text-xs font-medium ${r.status === "active" ? "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200" : "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200"}`}>{r.status}</span> },
    { key: "actions", header: "Actions", render: (r: ProductRow) => (effectiveRole === "business_admin" ? <Link href={`/admin/products/${r.id}/edit`} className="text-indigo-600 dark:text-indigo-400 hover:underline font-medium">Edit</Link> : <span className="text-gray-400">—</span>) },
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
