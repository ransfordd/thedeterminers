"use server";

import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Decimal } from "@prisma/client/runtime/library";

export type ProductState = { success?: boolean; error?: string };

export async function createProduct(_prev: ProductState, formData: FormData): Promise<ProductState> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return { error: "Not authenticated" };
  if ((session.user as { role?: string }).role !== "business_admin") return { error: "Not authorized" };

  const productName = (formData.get("productName") as string)?.trim();
  const productCode = (formData.get("productCode") as string)?.trim().toUpperCase();
  const description = (formData.get("description") as string)?.trim() || null;
  const minAmount = parseFloat((formData.get("minAmount") as string) ?? "0");
  const maxAmount = parseFloat((formData.get("maxAmount") as string) ?? "0");
  const interestRate = parseFloat((formData.get("interestRate") as string) ?? "0");
  const interestType = ((formData.get("interestType") as string) === "reducing_balance" ? "reducing_balance" : "flat") as "flat" | "reducing_balance";
  const minTermMonths = parseInt((formData.get("minTermMonths") as string) ?? "1", 10);
  const maxTermMonths = parseInt((formData.get("maxTermMonths") as string) ?? "12", 10);
  const processingFeeRate = parseFloat((formData.get("processingFeeRate") as string) ?? "0");
  const status = ((formData.get("status") as string) === "inactive" ? "inactive" : "active") as "active" | "inactive";

  if (!productName || !productCode) return { error: "Product name and code are required" };
  if (minAmount < 0 || maxAmount < minAmount) return { error: "Invalid amount range" };
  if (minTermMonths < 1 || maxTermMonths < minTermMonths) return { error: "Invalid term range" };

  const existing = await prisma.loanProduct.findUnique({ where: { productCode } });
  if (existing) return { error: "Product code already in use" };

  await prisma.loanProduct.create({
    data: {
      productName,
      productCode,
      description,
      minAmount: new Decimal(minAmount),
      maxAmount: new Decimal(maxAmount),
      interestRate: new Decimal(interestRate),
      interestType,
      minTermMonths,
      maxTermMonths,
      processingFeeRate: new Decimal(processingFeeRate),
      status,
    },
  });

  const adminManagerUsers = await prisma.user.findMany({
    where: { role: { in: ["business_admin", "manager"] }, status: "active" },
    select: { id: true },
  });
  if (adminManagerUsers.length > 0) {
    await prisma.notification.createMany({
      data: adminManagerUsers.map((u) => ({
        userId: u.id,
        notificationType: "system_alert",
        title: "Loan product created",
        message: `Loan product "${productName}" (${productCode}) has been added.`,
      })),
    }).catch(() => { /* ignore */ });
  }

  revalidatePath("/admin/products");
  revalidatePath("/admin/products/new");
  return { success: true };
}
