"use server";

import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Decimal } from "@prisma/client/runtime/library";

export type UpdateCollectionState = { success?: boolean; error?: string };

export async function updateCollection(
  _prev: UpdateCollectionState,
  formData: FormData
): Promise<UpdateCollectionState> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return { error: "Not authenticated" };
  const role = (session.user as { role?: string }).role;
  if (role !== "business_admin" && role !== "manager") return { error: "Not authorized" };

  const id = Number(formData.get("id"));
  if (!Number.isInteger(id) || id < 1) return { error: "Invalid collection" };

  const amountRaw = (formData.get("collectedAmount") as string)?.trim();
  const amount = amountRaw ? parseFloat(amountRaw) : NaN;
  if (amountRaw == null || amountRaw === "" || !Number.isFinite(amount) || amount < 0)
    return { error: "Enter a valid amount (GHS)" };

  const collectionTimeRaw = (formData.get("collectionTime") as string)?.trim();
  let collectionTime: Date | null = null;
  if (collectionTimeRaw) {
    const parsed = new Date(collectionTimeRaw);
    if (!Number.isNaN(parsed.getTime())) collectionTime = parsed;
  }

  const collectedByIdRaw = (formData.get("collectedById") as string)?.trim();
  const collectedById = collectedByIdRaw
    ? (() => {
        const n = parseInt(collectedByIdRaw, 10);
        return Number.isInteger(n) && n > 0 ? n : null;
      })()
    : null;

  const notes = (formData.get("notes") as string)?.trim() || null;

  try {
    const existing = await prisma.dailyCollection.findUnique({
      where: { id },
      select: { collectionStatus: true },
    });
    if (!existing || existing.collectionStatus !== "collected")
      return { error: "Collection not found or not editable" };

    await prisma.dailyCollection.update({
      where: { id },
      data: {
        collectedAmount: new Decimal(amount),
        ...(collectionTime != null && { collectionTime: collectionTime }),
        collectedById,
        notes: notes ?? undefined,
      },
    });
  } catch {
    return { error: "Failed to update collection" };
  }

  revalidatePath("/admin/transactions");
  revalidatePath(`/admin/transactions/susu/${id}`);
  return { success: true };
}

export async function deleteCollection(id: number): Promise<{ error?: string }> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return { error: "Not authenticated" };
  const role = (session.user as { role?: string }).role;
  if (role !== "business_admin" && role !== "manager") return { error: "Not authorized" };
  try {
    await prisma.dailyCollection.delete({ where: { id } });
  } catch {
    return { error: "Not found" };
  }
  revalidatePath("/admin/transactions");
  revalidatePath("/admin");
  return {};
}

export async function deleteCollectionForm(formData: FormData): Promise<{ error?: string }> {
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id) || id < 1) return { error: "Invalid id" };
  return deleteCollection(id);
}

export type UpdateLoanPaymentState = { success?: boolean; error?: string };

export async function updateLoanPayment(
  _prev: UpdateLoanPaymentState,
  formData: FormData
): Promise<UpdateLoanPaymentState> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return { error: "Not authenticated" };
  const role = (session.user as { role?: string }).role;
  if (role !== "business_admin" && role !== "manager") return { error: "Not authorized" };

  const id = Number(formData.get("id"));
  if (!Number.isInteger(id) || id < 1) return { error: "Invalid payment" };

  const amountRaw = (formData.get("amountPaid") as string)?.trim();
  const amount = amountRaw ? parseFloat(amountRaw) : NaN;
  if (amountRaw == null || amountRaw === "" || !Number.isFinite(amount) || amount < 0)
    return { error: "Enter a valid amount paid (GHS)" };

  const paymentDateRaw = (formData.get("paymentDate") as string)?.trim();
  let paymentDate: Date | null = null;
  if (paymentDateRaw) {
    const parsed = new Date(paymentDateRaw);
    if (!Number.isNaN(parsed.getTime())) paymentDate = parsed;
  }

  const collectedByIdRaw = (formData.get("collectedById") as string)?.trim();
  const collectedById = collectedByIdRaw
    ? (() => {
        const n = parseInt(collectedByIdRaw, 10);
        return Number.isInteger(n) && n > 0 ? n : null;
      })()
    : null;

  const notes = (formData.get("notes") as string)?.trim() || null;

  try {
    const existing = await prisma.loanPayment.findUnique({
      where: { id },
      select: { paymentStatus: true },
    });
    if (!existing || existing.paymentStatus !== "paid") return { error: "Payment not found or not editable" };

    await prisma.loanPayment.update({
      where: { id },
      data: {
        amountPaid: new Decimal(amount),
        ...(paymentDate != null && { paymentDate: paymentDate }),
        collectedById,
        notes: notes ?? undefined,
      },
    });
  } catch {
    return { error: "Failed to update payment" };
  }

  revalidatePath("/admin/transactions");
  revalidatePath(`/admin/transactions/loan/${id}`);
  return { success: true };
}

export async function deleteLoanPayment(id: number): Promise<{ error?: string }> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return { error: "Not authenticated" };
  const role = (session.user as { role?: string }).role;
  if (role !== "business_admin" && role !== "manager") return { error: "Not authorized" };
  try {
    await prisma.loanPayment.delete({ where: { id } });
  } catch {
    return { error: "Not found" };
  }
  revalidatePath("/admin/transactions");
  revalidatePath("/admin");
  return {};
}

export async function deleteLoanPaymentForm(formData: FormData): Promise<{ error?: string }> {
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id) || id < 1) return { error: "Invalid id" };
  return deleteLoanPayment(id);
}
