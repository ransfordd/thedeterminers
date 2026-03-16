import { prisma } from "@/lib/db";
import { Decimal } from "@prisma/client/runtime/library";

/**
 * Debit a client's savings account. Fails if insufficient balance.
 * Used for pay-cycle-from-savings and pay-loan-from-savings.
 */
export async function debitClientSavings(
  clientId: number,
  amount: number,
  source: "withdrawal_request",
  purpose: "cycle_payment" | "loan_payment" | "withdrawal",
  description: string,
  processedById: number | null
): Promise<{ success: true } | { success: false; error: string }> {
  const account = await prisma.savingsAccount.findUnique({
    where: { clientId },
    select: { id: true, balance: true },
  });
  if (!account) return { success: false, error: "Savings account not found" };
  const currentBalance = Number(account.balance);
  if (amount <= 0) return { success: false, error: "Amount must be greater than 0" };
  if (currentBalance < amount) return { success: false, error: "Insufficient savings balance" };
  const newBalance = currentBalance - amount;
  await prisma.$transaction([
    prisma.savingsAccount.update({
      where: { id: account.id },
      data: { balance: new Decimal(newBalance) },
    }),
    prisma.savingsTransaction.create({
      data: {
        savingsAccountId: account.id,
        transactionType: "withdrawal",
        amount: new Decimal(amount),
        balanceAfter: new Decimal(newBalance),
        source,
        purpose,
        description,
        processedById,
      },
    }),
  ]);
  return { success: true };
}

/**
 * Credit a client's savings account (creates account if needed).
 * Used for Susu overpayment remainder and cycle-complete full amount.
 */
export async function creditClientSavings(
  clientId: number,
  amount: number,
  source: "overpayment" | "cycle_completion",
  description: string,
  processedById: number | null
): Promise<void> {
  const account = await prisma.savingsAccount.upsert({
    where: { clientId },
    create: { clientId, balance: 0 },
    update: {},
    select: { id: true, balance: true },
  });
  const currentBalance = Number(account.balance);
  const newBalance = currentBalance + amount;
  await prisma.$transaction([
    prisma.savingsAccount.update({
      where: { id: account.id },
      data: { balance: new Decimal(newBalance) },
    }),
    prisma.savingsTransaction.create({
      data: {
        savingsAccountId: account.id,
        transactionType: "deposit",
        amount: new Decimal(amount),
        balanceAfter: new Decimal(newBalance),
        source,
        purpose: "savings_deposit",
        description,
        processedById,
      },
    }),
  ]);
}
