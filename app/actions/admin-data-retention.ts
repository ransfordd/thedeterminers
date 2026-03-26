"use server";

import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  bulkDeleteClients,
  deleteClientAndUserCompletely,
  exportClientData,
  previewClientDeletionImpact,
  simulateClientDeletion,
  type ExportClientFormat,
} from "@/lib/admin/delete-client";

export type DeleteClientAccountState = {
  success?: boolean;
  error?: string;
  message?: string;
  exportFilename?: string;
  exportMimeType?: string;
  exportContent?: string;
  preview?: {
    clientId: number;
    clientCode: string;
    hasBlockingLoan: boolean;
    blockingLoanCount: number;
    totalRecords: number;
    counts: Record<string, number>;
  };
  history?: Array<{
    id: number;
    action: string;
    createdAt: string;
    targetClientId: number | null;
    targetUserId: number | null;
    details: string | null;
    performedByName: string;
  }>;
};

const ADMIN_DELETE_COOLDOWN_MS = 2_500;
const adminCooldownMap = new Map<number, number>();

async function requireBusinessAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return { error: "Please sign in to continue." } as const;
  const role = (session.user as { role?: string }).role;
  if (role !== "business_admin") return { error: "Only a business admin can use this page." } as const;
  const adminId = parseInt((session.user as { id?: string }).id ?? "0", 10);
  if (!adminId) return { error: "Your session is not valid. Please sign in again." } as const;
  return { adminId } as const;
}

function enforceAdminCooldown(adminId: number) {
  const now = Date.now();
  const last = adminCooldownMap.get(adminId) ?? 0;
  if (now - last < ADMIN_DELETE_COOLDOWN_MS) {
    const waitSeconds = Math.ceil((ADMIN_DELETE_COOLDOWN_MS - (now - last)) / 1000);
    return `Please wait ${waitSeconds} second(s) before trying again.`;
  }
  adminCooldownMap.set(adminId, now);
  return null;
}

export async function deleteClientAccountAdmin(
  _prev: DeleteClientAccountState,
  formData: FormData
): Promise<DeleteClientAccountState> {
  const auth = await requireBusinessAdmin();
  if ("error" in auth) return { error: auth.error };
  const adminId = auth.adminId;
  const cooldownError = enforceAdminCooldown(adminId);
  if (cooldownError) return { error: cooldownError };

  const clientId = parseInt(String(formData.get("clientId") ?? "0"), 10);
  const confirmCode = String(formData.get("confirmClientCode") ?? "").trim();
  const confirmPhrase = String(formData.get("confirmPhrase") ?? "").trim().toUpperCase();
  const acknowledged = String(formData.get("ackRisk") ?? "") === "on";
  const allowLoanOverride = String(formData.get("allowLoanOverride") ?? "") === "on";
  const overrideReason = String(formData.get("overrideReason") ?? "").trim();
  if (!clientId) return { error: "Please select a client." };
  if (!confirmCode) return { error: "Please enter the client code to confirm." };
  if (confirmPhrase !== "DELETE CLIENT") return { error: "Please type DELETE CLIENT to continue." };
  if (!acknowledged) return { error: "Please tick the box to confirm this cannot be undone." };

  const result = await deleteClientAndUserCompletely(prisma, {
    clientId,
    confirmedCode: confirmCode,
    performedByUserId: adminId,
    allowLoanOverride,
    overrideReason: overrideReason || undefined,
    mode: "delete",
  });

  if (!result.ok) return { error: result.error };

  revalidatePath("/admin");
  revalidatePath("/admin/clients");
  revalidatePath("/admin/data-retention");
  revalidatePath("/manager/clients");
  revalidatePath("/admin/transactions");
  revalidatePath("/admin/applications");

  return {
    success: true,
    message: `Client ${result.clientCode} has been removed permanently, along with related data.`,
  };
}

export async function previewDeleteClientAccountAdmin(
  _prev: DeleteClientAccountState,
  formData: FormData
): Promise<DeleteClientAccountState> {
  const auth = await requireBusinessAdmin();
  if ("error" in auth) return { error: auth.error };

  const clientId = parseInt(String(formData.get("clientId") ?? "0"), 10);
  if (!clientId) return { error: "Please select a client first." };

  const preview = await previewClientDeletionImpact(prisma, clientId);
  if (!preview.ok) return { error: preview.error };

  return {
    success: true,
    message: "Ready. Review what will be removed below.",
    preview: {
      clientId: preview.impact.clientId,
      clientCode: preview.impact.clientCode,
      hasBlockingLoan: preview.impact.hasBlockingLoan,
      blockingLoanCount: preview.impact.blockingLoanCount,
      totalRecords: preview.impact.totalRecords,
      counts: preview.impact.counts,
    },
  };
}

export async function dryRunDeleteClientAccountAdmin(
  _prev: DeleteClientAccountState,
  formData: FormData
): Promise<DeleteClientAccountState> {
  const auth = await requireBusinessAdmin();
  if ("error" in auth) return { error: auth.error };
  const adminId = auth.adminId;
  const cooldownError = enforceAdminCooldown(adminId);
  if (cooldownError) return { error: cooldownError };

  const clientId = parseInt(String(formData.get("clientId") ?? "0"), 10);
  const confirmCode = String(formData.get("confirmClientCode") ?? "").trim();
  const allowLoanOverride = String(formData.get("allowLoanOverride") ?? "") === "on";
  const overrideReason = String(formData.get("overrideReason") ?? "").trim();
  if (!clientId) return { error: "Please select a client." };
  if (!confirmCode) return { error: "Please enter the client code before running the test." };

  const result = await simulateClientDeletion(prisma, {
    clientId,
    confirmedCode: confirmCode,
    performedByUserId: adminId,
    allowLoanOverride,
    overrideReason: overrideReason || undefined,
  });
  if (!result.ok) return { error: result.error };

  return {
    success: true,
    message: result.message,
    preview: {
      clientId: result.impact.clientId,
      clientCode: result.impact.clientCode,
      hasBlockingLoan: result.impact.hasBlockingLoan,
      blockingLoanCount: result.impact.blockingLoanCount,
      totalRecords: result.impact.totalRecords,
      counts: result.impact.counts,
    },
  };
}

export async function exportDeleteClientDataAdmin(
  _prev: DeleteClientAccountState,
  formData: FormData
): Promise<DeleteClientAccountState> {
  const auth = await requireBusinessAdmin();
  if ("error" in auth) return { error: auth.error };

  const clientId = parseInt(String(formData.get("clientId") ?? "0"), 10);
  const formatRaw = String(formData.get("exportFormat") ?? "json").toLowerCase();
  const format: ExportClientFormat = formatRaw === "csv" ? "csv" : "json";
  if (!clientId) return { error: "Please select a client before downloading." };

  const exported = await exportClientData(prisma, clientId, format);
  if (!exported.ok) return { error: exported.error };

  const preview = await previewClientDeletionImpact(prisma, clientId);
  if (!preview.ok) return { error: preview.error };

  await prisma.adminDataRetentionLog.create({
    data: {
      action: "delete_client_export",
      performedById: auth.adminId,
      targetUserId: preview.impact.userId,
      targetClientId: preview.impact.clientId,
      details: JSON.stringify({
        mode: "export",
        format,
        filename: exported.filename,
        totalRecords: preview.impact.totalRecords,
      }),
    },
  });

  return {
    success: true,
    message: "Your file is ready. Please download it before removing the client.",
    exportFilename: exported.filename,
    exportMimeType: exported.mimeType,
    exportContent: exported.content,
    preview: {
      clientId: preview.impact.clientId,
      clientCode: preview.impact.clientCode,
      hasBlockingLoan: preview.impact.hasBlockingLoan,
      blockingLoanCount: preview.impact.blockingLoanCount,
      totalRecords: preview.impact.totalRecords,
      counts: preview.impact.counts,
    },
  };
}

export async function bulkDeleteClientAccountAdmin(
  _prev: DeleteClientAccountState,
  formData: FormData
): Promise<DeleteClientAccountState> {
  const auth = await requireBusinessAdmin();
  if ("error" in auth) return { error: auth.error };
  const adminId = auth.adminId;
  const cooldownError = enforceAdminCooldown(adminId);
  if (cooldownError) return { error: cooldownError };

  const clientIds = formData
    .getAll("bulkClientIds")
    .map((v) => parseInt(String(v), 10))
    .filter((v) => Number.isInteger(v) && v > 0);
  const allowLoanOverride = String(formData.get("allowLoanOverride") ?? "") === "on";
  const overrideReason = String(formData.get("overrideReason") ?? "").trim();
  if (clientIds.length === 0) return { error: "Please select at least one client." };
  if (allowLoanOverride && !overrideReason) return { error: "Please enter a reason to use loan override." };

  const result = await bulkDeleteClients(prisma, {
    clientIds,
    performedByUserId: adminId,
    allowLoanOverride,
    overrideReason: overrideReason || undefined,
  });

  await prisma.adminDataRetentionLog.create({
    data: {
      action: "bulk_delete_client",
      performedById: adminId,
      details: JSON.stringify({
        mode: "bulk_delete",
        total: result.total,
        successCount: result.successCount,
        failedCount: result.failedCount,
        allowLoanOverride,
      }),
    },
  });

  revalidatePath("/admin");
  revalidatePath("/admin/clients");
  revalidatePath("/admin/data-retention");
  revalidatePath("/manager/clients");
  revalidatePath("/admin/transactions");
  revalidatePath("/admin/applications");

  return {
    success: result.failedCount === 0,
    message: `Done. ${result.successCount} client(s) removed, ${result.failedCount} client(s) not removed.`,
    error: result.failedCount > 0 ? result.results.filter((r) => !r.ok).map((r) => r.error || "Unknown error").join(" | ") : undefined,
  };
}

export async function getAdminDataRetentionHistory(): Promise<DeleteClientAccountState["history"]> {
  const auth = await requireBusinessAdmin();
  if ("error" in auth) return [];

  const logs = await prisma.adminDataRetentionLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 30,
    include: {
      performedBy: { select: { firstName: true, lastName: true } },
    },
  });

  return logs.map((l) => ({
    id: l.id,
    action: l.action,
    createdAt: l.createdAt.toISOString(),
    targetClientId: l.targetClientId,
    targetUserId: l.targetUserId,
    details: l.details,
    performedByName: `${l.performedBy.firstName ?? ""} ${l.performedBy.lastName ?? ""}`.trim() || "Unknown admin",
  }));
}
