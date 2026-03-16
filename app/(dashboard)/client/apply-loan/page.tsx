import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { getClientByUserId, getLoanProducts } from "@/lib/dashboard";
import { PageHeader, ModernCard } from "@/components/dashboard";
import { ApplyLoanForm } from "./ApplyLoanForm";

export default async function ClientApplyLoanPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  if ((session.user as { role?: string }).role !== "client") redirect("/dashboard");

  const userId = (session.user as { id?: string }).id;
  const [client, products] = await Promise.all([
    getClientByUserId(userId ? parseInt(String(userId), 10) : 0),
    getLoanProducts(),
  ]);
  if (!client) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/30 p-6 text-center">
        <p className="font-medium text-amber-800">Client record not found.</p>
        <a href="/client" className="inline-block mt-3 text-sm text-blue-600 hover:underline">Back to Dashboard</a>
      </div>
    );
  }

  const productList = products
    .filter((p) => p.status === "active")
    .map((p) => ({
      id: p.id,
      productName: p.productName,
      productCode: p.productCode,
      minAmount: p.minAmount,
      maxAmount: p.maxAmount,
      minTermMonths: p.minTermMonths,
      maxTermMonths: p.maxTermMonths,
    }));

  return (
    <>
      <PageHeader
        title="Apply for Loan"
        subtitle="Submit a new loan application"
        icon={<i className="fas fa-file-alt" />}
        backHref="/client"
        variant="orange"
      />
      <ModernCard
        title="Loan application"
        subtitle="Choose a product and fill in the application details"
        icon={<i className="fas fa-box" />}
      >
        {productList.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400">No loan products available. Contact your agent or administrator.</p>
        ) : (
          <ApplyLoanForm clientId={client.id} products={productList} />
        )}
      </ModernCard>
    </>
  );
}
