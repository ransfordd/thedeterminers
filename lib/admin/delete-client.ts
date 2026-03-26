import { rm, unlink } from "fs/promises";
import path from "path";
import type { PrismaClient } from "@prisma/client";

const PROFILES_DIR = path.join(process.cwd(), "public", "uploads", "profiles");

export type DeleteClientResult =
  | { ok: true; clientCode: string; userId: number; clientId: number }
  | { ok: false; error: string };

export type DeletionMode = "preview" | "dry_run" | "delete" | "bulk_delete" | "export";

export type DeletionImpact = {
  clientId: number;
  clientCode: string;
  userId: number;
  hasBlockingLoan: boolean;
  blockingLoanCount: number;
  counts: Record<string, number>;
  totalRecords: number;
};

export type DeleteClientOptions = {
  clientId: number;
  confirmedCode: string;
  performedByUserId: number;
  allowLoanOverride?: boolean;
  overrideReason?: string;
  mode?: DeletionMode;
  dryRun?: boolean;
};

export type ExportClientFormat = "json" | "csv";

export type ClientExportResult =
  | { ok: true; filename: string; mimeType: string; content: string }
  | { ok: false; error: string };

export type BulkDeleteResult = {
  ok: boolean;
  total: number;
  successCount: number;
  failedCount: number;
  results: Array<{ clientId: number; ok: boolean; clientCode?: string; error?: string }>;
};

async function getClientRow(prisma: PrismaClient, clientId: number) {
  return prisma.client.findUnique({
    where: { id: clientId },
    include: {
      user: { select: { id: true, role: true, profileImage: true, firstName: true, lastName: true } },
    },
  });
}

async function getDeletionCounts(prisma: PrismaClient, clientId: number, userId: number) {
  const [loanIds, cycleIds, ewrIds, savings] = await Promise.all([
    prisma.loan.findMany({ where: { clientId }, select: { id: true } }),
    prisma.susuCycle.findMany({ where: { clientId }, select: { id: true } }),
    prisma.emergencyWithdrawalRequest.findMany({ where: { clientId }, select: { id: true } }),
    prisma.savingsAccount.findUnique({ where: { clientId }, select: { id: true } }),
  ]);

  const loanIdList = loanIds.map((l) => l.id);
  const cycleIdList = cycleIds.map((c) => c.id);
  const ewrIdList = ewrIds.map((r) => r.id);
  const savingsAccountId = savings?.id;

  const [
    loans,
    loanPayments,
    loanApplications,
    susuCycles,
    dailyCollections,
    emergencyWithdrawalRequests,
    emergencyWithdrawalTransactions,
    manualTransactions,
    loanDeductionNotifications,
    savingsAccounts,
    savingsTransactions,
    notifications,
    userDocuments,
    userActivities,
  ] = await Promise.all([
    prisma.loan.count({ where: { clientId } }),
    loanIdList.length > 0 ? prisma.loanPayment.count({ where: { loanId: { in: loanIdList } } }) : 0,
    prisma.loanApplication.count({ where: { clientId } }),
    prisma.susuCycle.count({ where: { clientId } }),
    cycleIdList.length > 0 ? prisma.dailyCollection.count({ where: { susuCycleId: { in: cycleIdList } } }) : 0,
    prisma.emergencyWithdrawalRequest.count({ where: { clientId } }),
    ewrIdList.length > 0 ? prisma.emergencyWithdrawalTransaction.count({ where: { requestId: { in: ewrIdList } } }) : 0,
    prisma.manualTransaction.count({ where: { clientId } }),
    prisma.loanDeductionNotification.count({ where: { clientId } }),
    prisma.savingsAccount.count({ where: { clientId } }),
    savingsAccountId ? prisma.savingsTransaction.count({ where: { savingsAccountId } }) : 0,
    prisma.notification.count({ where: { userId } }),
    prisma.userDocument.count({ where: { userId } }),
    prisma.userActivity.count({ where: { userId } }),
  ]);

  return {
    loans,
    loanPayments,
    loanApplications,
    susuCycles,
    dailyCollections,
    emergencyWithdrawalRequests,
    emergencyWithdrawalTransactions,
    manualTransactions,
    loanDeductionNotifications,
    savingsAccounts,
    savingsTransactions,
    notifications,
    userDocuments,
    userActivities,
    client: 1,
    user: 1,
  };
}

function buildCsvFromImpact(clientCode: string, counts: Record<string, number>) {
  const lines = ["entity,count", ...Object.entries(counts).map(([k, v]) => `${k},${v}`)];
  return `client_code,${clientCode}\n${lines.join("\n")}\n`;
}

export async function previewClientDeletionImpact(
  prisma: PrismaClient,
  clientId: number
): Promise<{ ok: true; impact: DeletionImpact } | { ok: false; error: string }> {
  const clientRow = await getClientRow(prisma, clientId);
  if (!clientRow) return { ok: false, error: "We could not find this client." };
  if (clientRow.user.role !== "client") return { ok: false, error: "You can only remove client accounts here." };

  const [blockingLoanCount, counts] = await Promise.all([
    prisma.loan.count({ where: { clientId, loanStatus: { in: ["active", "defaulted"] } } }),
    getDeletionCounts(prisma, clientId, clientRow.userId),
  ]);
  const totalRecords = Object.values(counts).reduce((sum, n) => sum + n, 0);

  return {
    ok: true,
    impact: {
      clientId,
      clientCode: clientRow.clientCode,
      userId: clientRow.userId,
      hasBlockingLoan: blockingLoanCount > 0,
      blockingLoanCount,
      counts,
      totalRecords,
    },
  };
}

export async function exportClientData(
  prisma: PrismaClient,
  clientId: number,
  format: ExportClientFormat
): Promise<ClientExportResult> {
  const preview = await previewClientDeletionImpact(prisma, clientId);
  if (!preview.ok) return { ok: false, error: preview.error };

  const { impact } = preview;
  if (format === "csv") {
    return {
      ok: true,
      filename: `client-${impact.clientCode}-deletion-preview.csv`,
      mimeType: "text/csv;charset=utf-8",
      content: buildCsvFromImpact(impact.clientCode, impact.counts),
    };
  }

  return {
    ok: true,
    filename: `client-${impact.clientCode}-deletion-preview.json`,
    mimeType: "application/json;charset=utf-8",
    content: JSON.stringify(impact, null, 2),
  };
}

export async function simulateClientDeletion(
  prisma: PrismaClient,
  options: Omit<DeleteClientOptions, "mode" | "dryRun">
): Promise<{ ok: true; impact: DeletionImpact; message: string } | { ok: false; error: string }> {
  const preview = await previewClientDeletionImpact(prisma, options.clientId);
  if (!preview.ok) return { ok: false, error: preview.error };

  const { impact } = preview;
  if (impact.clientCode.trim().toUpperCase() !== options.confirmedCode.trim().toUpperCase()) {
    return { ok: false, error: "The client code does not match. Please type it exactly as shown." };
  }
  if (impact.hasBlockingLoan && !options.allowLoanOverride) {
    return {
      ok: false,
      error: "This client still has active or overdue loans. To continue, turn on override and explain why.",
    };
  }
  if (impact.hasBlockingLoan && options.allowLoanOverride && !options.overrideReason?.trim()) {
    return { ok: false, error: "Please enter a reason before continuing with loan override." };
  }

  await prisma.adminDataRetentionLog.create({
    data: {
      action: "delete_client_dry_run",
      performedById: options.performedByUserId,
      targetUserId: impact.userId,
      targetClientId: impact.clientId,
      details: JSON.stringify({
        mode: "dry_run",
        allowLoanOverride: !!options.allowLoanOverride,
        overrideReason: options.overrideReason?.trim() || null,
        blockingLoanCount: impact.blockingLoanCount,
        totalRecords: impact.totalRecords,
      }),
    },
  });

  return {
    ok: true,
    impact,
    message: `Test complete. ${impact.totalRecords} items would be removed if you continue.`,
  };
}

export async function deleteClientAndUserCompletely(
  prisma: PrismaClient,
  options: DeleteClientOptions
): Promise<DeleteClientResult> {
  const { clientId, confirmedCode, performedByUserId, allowLoanOverride, overrideReason } = options;

  const clientRow = await getClientRow(prisma, clientId);

  if (!clientRow) return { ok: false, error: "We could not find this client." };
  if (clientRow.user.role !== "client") return { ok: false, error: "You can only remove client accounts here." };

  if (clientRow.clientCode.trim().toUpperCase() !== confirmedCode.trim().toUpperCase()) {
    return { ok: false, error: "The client code does not match. Please type it exactly as shown." };
  }

  const blockingLoans = await prisma.loan.count({
    where: {
      clientId,
      loanStatus: { in: ["active", "defaulted"] },
    },
  });
  if (blockingLoans > 0) {
    if (!allowLoanOverride) {
      return {
        ok: false,
        error:
          "This client has active or overdue loans. Close those loans first, or use override with a reason.",
      };
    }
    if (!overrideReason?.trim()) {
      return { ok: false, error: "Please enter a reason before removing a client with active or overdue loans." };
    }
  }

  const preview = await previewClientDeletionImpact(prisma, clientId);
  if (!preview.ok) return { ok: false, error: preview.error };

  const impact = preview.impact;

  if (options.dryRun) {
    await prisma.adminDataRetentionLog.create({
      data: {
        action: "delete_client_dry_run",
        performedById: performedByUserId,
        targetUserId: impact.userId,
        targetClientId: impact.clientId,
        details: JSON.stringify({
          mode: "dry_run",
          allowLoanOverride: !!allowLoanOverride,
          overrideReason: overrideReason?.trim() || null,
          blockingLoanCount: impact.blockingLoanCount,
          totalRecords: impact.totalRecords,
        }),
      },
    });
    return {
      ok: true,
      clientCode: impact.clientCode,
      userId: impact.userId,
      clientId: impact.clientId,
    };
  }

  const targetUserId = clientRow.userId;
  const profileImage = clientRow.user.profileImage;

  await prisma.$transaction(
    async (tx) => {
      const ewrIds = await tx.emergencyWithdrawalRequest.findMany({
        where: { clientId },
        select: { id: true },
      });
      const ewrIdList = ewrIds.map((r) => r.id);
      if (ewrIdList.length > 0) {
        await tx.emergencyWithdrawalTransaction.deleteMany({ where: { requestId: { in: ewrIdList } } });
      }
      await tx.emergencyWithdrawalRequest.deleteMany({ where: { clientId } });

      const loanIds = (await tx.loan.findMany({ where: { clientId }, select: { id: true } })).map((l) => l.id);
      if (loanIds.length > 0) {
        await tx.loanPayment.deleteMany({ where: { loanId: { in: loanIds } } });
      }
      await tx.loan.deleteMany({ where: { clientId } });

      await tx.loanApplication.deleteMany({ where: { clientId } });

      const cycleIds = (await tx.susuCycle.findMany({ where: { clientId }, select: { id: true } })).map((c) => c.id);
      if (cycleIds.length > 0) {
        await tx.dailyCollection.deleteMany({ where: { susuCycleId: { in: cycleIds } } });
      }
      await tx.susuCycle.deleteMany({ where: { clientId } });

      await tx.manualTransaction.deleteMany({ where: { clientId } });
      await tx.loanDeductionNotification.deleteMany({ where: { clientId } });

      const savings = await tx.savingsAccount.findUnique({ where: { clientId }, select: { id: true } });
      if (savings) {
        await tx.savingsTransaction.deleteMany({ where: { savingsAccountId: savings.id } });
        await tx.savingsAccount.delete({ where: { clientId } });
      }

      await tx.client.delete({ where: { id: clientId } });

      await tx.notification.deleteMany({ where: { userId: targetUserId } });
      await tx.userDocument.deleteMany({ where: { userId: targetUserId } });
      await tx.userActivity.deleteMany({ where: { userId: targetUserId } });

      await tx.user.delete({ where: { id: targetUserId } });

      await tx.adminDataRetentionLog.create({
        data: {
          action: "delete_client",
          performedById: performedByUserId,
          targetUserId,
          targetClientId: clientId,
          details: JSON.stringify({
            mode: options.mode ?? "delete",
            clientCode: clientRow.clientCode,
            allowLoanOverride: !!allowLoanOverride,
            overrideReason: overrideReason?.trim() || null,
            blockingLoanCount: impact.blockingLoanCount,
            totalRecords: impact.totalRecords,
            counts: impact.counts,
          }),
        },
      });
    },
    { timeout: 120_000 }
  );

  try {
    const docDir = path.join(process.cwd(), "public", "uploads", "documents", String(targetUserId));
    await rm(docDir, { recursive: true, force: true });
  } catch {
    /* ignore */
  }

  if (profileImage && profileImage.includes("/api/uploads/profiles/")) {
    try {
      const filename = profileImage.split("/api/uploads/profiles/").pop();
      if (filename) {
        const decoded = decodeURIComponent(filename);
        const filePath = path.join(PROFILES_DIR, path.basename(decoded));
        await unlink(filePath);
      }
    } catch {
      /* ignore */
    }
  }

  return { ok: true, clientCode: clientRow.clientCode, userId: targetUserId, clientId };
}

export async function bulkDeleteClients(
  prisma: PrismaClient,
  options: {
    clientIds: number[];
    performedByUserId: number;
    allowLoanOverride?: boolean;
    overrideReason?: string;
  }
): Promise<BulkDeleteResult> {
  const uniqueClientIds = Array.from(new Set(options.clientIds.filter((id) => Number.isInteger(id) && id > 0)));
  const results: BulkDeleteResult["results"] = [];

  for (const clientId of uniqueClientIds) {
    const preview = await previewClientDeletionImpact(prisma, clientId);
    if (!preview.ok) {
      results.push({ clientId, ok: false, error: preview.error });
      continue;
    }
    const result = await deleteClientAndUserCompletely(prisma, {
      clientId,
      confirmedCode: preview.impact.clientCode,
      performedByUserId: options.performedByUserId,
      allowLoanOverride: options.allowLoanOverride,
      overrideReason: options.overrideReason,
      mode: "bulk_delete",
    });
    results.push(result.ok ? { clientId, ok: true, clientCode: result.clientCode } : { clientId, ok: false, error: result.error });
  }

  const successCount = results.filter((r) => r.ok).length;
  const failedCount = results.length - successCount;

  return {
    ok: failedCount === 0,
    total: results.length,
    successCount,
    failedCount,
    results,
  };
}

