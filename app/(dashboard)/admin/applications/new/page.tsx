import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { getClientsList, getLoanProducts } from "@/lib/dashboard";
import { PageHeader, ModernCard } from "@/components/dashboard";
import { NewApplicationForm } from "@/app/(dashboard)/agent/applications/new/NewApplicationForm";

export default async function AdminApplicationsNewPage({
  searchParams,
}: {
  searchParams: Promise<{ client_id?: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  const role = (session.user as { role?: string }).role;
  if (role !== "business_admin" && role !== "manager") redirect("/dashboard");

  const params = await searchParams;
  const [allClients, products] = await Promise.all([getClientsList(), getLoanProducts()]);

  const clients = allClients.map((c) => ({
    id: c.id,
    clientCode: c.clientCode,
    name: `${c.firstName} ${c.lastName}`.trim(),
  }));

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

  const clientIdParam = params.client_id ? parseInt(params.client_id, 10) : undefined;
  const isValidClient =
    clientIdParam != null && !Number.isNaN(clientIdParam) && clients.some((c) => c.id === clientIdParam);
  const initialClientId = isValidClient ? clientIdParam : undefined;

  const backHref = "/admin/applications";

  return (
    <>
      <PageHeader
        title="New loan application"
        subtitle="Submit on behalf of a client"
        icon={<i className="fas fa-file-alt" />}
        backHref={backHref}
        backLabel="Back to applications"
        variant="orange"
      />
      <ModernCard
        title="Application details"
        subtitle="Fill in the loan application information"
        icon={<i className="fas fa-plus-circle" />}
      >
        {clients.length === 0 ? (
          <p className="text-gray-600 dark:text-gray-400 text-sm">
            There are no clients in the system. Create a client first.
          </p>
        ) : productList.length === 0 ? (
          <p className="text-gray-600 dark:text-gray-400 text-sm">
            No active loan products. Add or activate a product in Loan Products.
          </p>
        ) : (
          <NewApplicationForm clients={clients} products={productList} initialClientId={initialClientId} />
        )}
      </ModernCard>
    </>
  );
}
