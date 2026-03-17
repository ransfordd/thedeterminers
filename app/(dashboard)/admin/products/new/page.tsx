import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { getLoanDefaults } from "@/lib/system-settings";
import { PageHeader, ModernCard } from "@/components/dashboard";
import { NewProductForm } from "./NewProductForm";

export default async function AdminProductsNewPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  if ((session.user as { role?: string }).role !== "business_admin") redirect("/dashboard");

  const loanDefaults = await getLoanDefaults();

  return (
    <>
      <PageHeader
        title="New loan product"
        subtitle="Create a new loan product"
        icon={<i className="fas fa-box" />}
        backHref="/admin/products"
        variant="primary"
      />
      <ModernCard title="Product details" subtitle="Name, code, amounts, term, and status" icon={<i className="fas fa-edit" />}>
        <NewProductForm
          defaultInterestRate={loanDefaults.defaultInterestRate}
          defaultMinAmount={loanDefaults.minLoanAmount}
          defaultMaxAmount={loanDefaults.maxLoanAmount}
        />
      </ModernCard>
    </>
  );
}
