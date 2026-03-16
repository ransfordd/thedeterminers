"use server";

import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Decimal } from "@prisma/client/runtime/library";

export type ManualTransactionState = { success?: boolean; error?: string };

const TYPES = ["deposit", "withdrawal", "savings_withdrawal", "emergency_withdrawal"] as const;
type T = (typeof TYPES)[number];

function toType(s: string): T {
  if (TYPES.includes(s as T)) return s as T;
  return "withdrawal";
}

export async function createManualTransaction(
  _prev: ManualTransactionState,
  formData: FormData
): Promise<ManualTransactionState> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return { error: "Not authenticated" };
  const role = (session.user as { role?: string }).role;
  if (role !== "business_admin" && role !== "manager") return { error: "Not authorized" };

  const userId = parseInt((session.user as { id?: string }).id ?? "0", 10);
  const clientId = parseInt((formData.get("clientId") as string) ?? "0", 10);
  const transactionType = toType((formData.get("transactionType") as string) || "withdrawal");
  const amount = parseFloat((formData.get("amount") as string) ?? "0");
  const description = (formData.get("description") as string)?.trim() || "Manual transaction";
  let reference = (formData.get("reference") as string)?.trim();

  if (!clientId) return { error: "Select a client" };
  if (amount <= 0) return { error: "Amount must be greater than 0" };

  if (!reference) reference = `MT-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
  const existing = await prisma.manualTransaction.findUnique({ where: { reference } });
  if (existing) return { error: "Reference already used" };

  await prisma.manualTransaction.create({
    data: {
      clientId,
      transactionType,
      amount: new Decimal(amount),
      description,
      reference,
      processedById: userId,
    },
  });

  const clientUser = await prisma.client.findUnique({
    where: { id: clientId },
    select: { userId: true },
  });
  if (clientUser?.userId) {
    await prisma.notification.create({
      data: {
        userId: clientUser.userId,
        notificationType: "payment_recorded",
        title: "Manual transaction recorded",
        message: `A manual ${transactionType.replace(/_/g, " ")} of GHS ${amount.toFixed(2)} was recorded. ${description}. Reference: ${reference}.`,
      },
    }).catch(() => { /* ignore */ });
  }

  revalidatePath("/admin/manual-transactions");
  revalidatePath("/admin");
  return { success: true };
}

export async function deleteManualTransaction(id: number): Promise<{ error?: string }> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return { error: "Not authenticated" };
  const role = (session.user as { role?: string }).role;
  if (role !== "business_admin" && role !== "manager") return { error: "Not authorized" };
  await prisma.manualTransaction.delete({ where: { id } });
  revalidatePath("/admin/transactions");
  revalidatePath("/admin");
  return {};
}

export async function deleteManualTransactionForm(formData: FormData): Promise<{ error?: string }> {
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id) || id < 1) return { error: "Invalid id" };
  return deleteManualTransaction(id);
}
