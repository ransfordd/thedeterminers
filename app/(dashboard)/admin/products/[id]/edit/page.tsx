import { getServerSession } from "next-auth";
import { redirect, notFound } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PageHeader, ModernCard } from "@/components/dashboard";
import { EditProductForm } from "./EditProductForm";

function toNum(d: unknown): number {
  if (d == null) return 0;
  return typeof d === "number" ? d : Number(d);
}

export default async function AdminProductEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  if ((session.user as { role?: string }).role !== "business_admin") redirect("/dashboard");

  const id = parseInt((await params).id, 10);
  if (isNaN(id)) notFound();

  const product = await prisma.loanProduct.findUnique({ where: { id } });
  if (!product) notFound();

  return (
    <>
      <PageHeader
        title="Edit Loan Product"
        subtitle={`${product.productName} (${product.productCode})`}
        icon={<i className="fas fa-box" />}
        backHref="/admin/products"
        variant="orange"
      />
      <ModernCard title="Product details" subtitle="Update product settings" icon={<i className="fas fa-edit" />}>
        <EditProductForm
          productId={product.id}
          defaultValue={{
            productName: product.productName,
            productCode: product.productCode,
            description: product.description ?? "",
            minAmount: toNum(product.minAmount),
            maxAmount: toNum(product.maxAmount),
            interestRate: toNum(product.interestRate),
            interestType: product.interestType,
            minTermMonths: product.minTermMonths,
            maxTermMonths: product.maxTermMonths,
            processingFeeRate: toNum(product.processingFeeRate),
            status: product.status,
          }}
        />
      </ModernCard>
    </>
  );
}
