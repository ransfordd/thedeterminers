"use server";

import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Decimal } from "@prisma/client/runtime/library";

export type ProductState = { success?: boolean; error?: string };

/** Aligns with @db.Decimal(18, 2) — values must fit Postgres NUMERIC(18,2). */
const MAX_MONEY = new Decimal("9999999999999999.99");
const MAX_RATE = new Decimal("999.99");

function validateProductNumbers(
  minAmount: number,
  maxAmount: number,
  interestRate: number,
  processingFeeRate: number,
  minTermMonths: number,
  maxTermMonths: number,
): string | null {
  if (
    !Number.isFinite(minAmount)
    || !Number.isFinite(maxAmount)
    || !Number.isFinite(interestRate)
    || !Number.isFinite(processingFeeRate)
    || !Number.isFinite(minTermMonths)
    || !Number.isFinite(maxTermMonths)
  ) {
    return "Invalid numeric values";
  }
  if (minAmount < 0 || maxAmount < minAmount) return "Invalid amount range";
  if (minTermMonths < 1 || maxTermMonths < minTermMonths) return "Invalid term range";
  const dMin = new Decimal(minAmount);
  const dMax = new Decimal(maxAmount);
  if (dMin.gt(MAX_MONEY) || dMax.gt(MAX_MONEY)) return "Amount exceeds maximum allowed";
  const i = new Decimal(interestRate);
  const p = new Decimal(processingFeeRate);
  if (i.lt(0) || i.gt(MAX_RATE)) return "Interest rate must be between 0 and 999.99";
  if (p.lt(0) || p.gt(MAX_RATE)) return "Processing fee rate must be between 0 and 999.99";
  return null;
}

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
  const numErr = validateProductNumbers(
    minAmount,
    maxAmount,
    interestRate,
    processingFeeRate,
    minTermMonths,
    maxTermMonths,
  );
  if (numErr) return { error: numErr };

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

export async function updateProduct(_prev: ProductState, formData: FormData): Promise<ProductState> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return { error: "Not authenticated" };
  if ((session.user as { role?: string }).role !== "business_admin") return { error: "Not authorized" };

  const productId = parseInt(String(formData.get("productId") ?? "0"), 10);
  if (!productId) return { error: "Invalid product" };

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
  const numErr = validateProductNumbers(
    minAmount,
    maxAmount,
    interestRate,
    processingFeeRate,
    minTermMonths,
    maxTermMonths,
  );
  if (numErr) return { error: numErr };

  const existing = await prisma.loanProduct.findUnique({ where: { id: productId } });
  if (!existing) return { error: "Product not found" };

  const codeConflict = await prisma.loanProduct.findFirst({ where: { productCode, id: { not: productId } } });
  if (codeConflict) return { error: "Product code already in use by another product" };

  await prisma.loanProduct.update({
    where: { id: productId },
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

  revalidatePath("/admin/products");
  revalidatePath(`/admin/products/${productId}/edit`);
  return { success: true };
}
