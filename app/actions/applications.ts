"use server";

import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { sendSmsToUserIds } from "@/lib/sms";
import { Decimal } from "@prisma/client/runtime/library";

export type ApplicationState = { success?: boolean; error?: string; applicationNumber?: string };

function generateApplicationNumber(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const r = Math.floor(1000 + Math.random() * 9000);
  return `APP-${y}${m}${d}-${r}`;
}

export async function createLoanApplication(
  _prev: ApplicationState,
  formData: FormData
): Promise<ApplicationState> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return { error: "Not authenticated" };

  const role = (session.user as { role?: string }).role;
  const userId = parseInt((session.user as { id?: string }).id ?? "0", 10);

  const clientId = parseInt((formData.get("clientId") as string) ?? "0", 10);
  const loanProductId = parseInt((formData.get("loanProductId") as string) ?? "0", 10);
  const requestedAmount = parseFloat((formData.get("requestedAmount") as string) ?? "0");
  const requestedTermMonths = parseInt((formData.get("requestedTermMonths") as string) ?? "0", 10);
  const purpose = (formData.get("purpose") as string)?.trim();
  const guarantorName = (formData.get("guarantorName") as string)?.trim() || null;
  const guarantorPhone = (formData.get("guarantorPhone") as string)?.trim() || null;
  const guarantorIdNumber = (formData.get("guarantorIdNumber") as string)?.trim() || null;
  const agentRecommendation = (formData.get("agentRecommendation") as string)?.trim() || null;

  if (!clientId || !loanProductId) return { error: "Client and loan product are required" };
  if (!purpose) return { error: "Purpose is required" };
  if (requestedAmount <= 0) return { error: "Requested amount must be greater than 0" };
  if (requestedTermMonths < 1) return { error: "Term must be at least 1 month" };

  if (role === "agent") {
    const agent = await prisma.agent.findFirst({ where: { userId } });
    if (!agent) return { error: "Agent record not found" };
    const assigned = await prisma.client.findFirst({
      where: { id: clientId, agentId: agent.id },
    });
    if (!assigned) return { error: "Client is not assigned to you" };
  } else if (role !== "business_admin" && role !== "manager") {
    const client = await prisma.client.findFirst({
      where: { id: clientId },
      include: { user: true },
    });
    if (!client || client.userId !== userId) return { error: "You can only apply for your own client account" };
  }

  const product = await prisma.loanProduct.findFirst({
    where: { id: loanProductId, status: "active" },
  });
  if (!product) return { error: "Loan product not found or inactive" };

  const minA = Number(product.minAmount);
  const maxA = Number(product.maxAmount);
  const minT = product.minTermMonths;
  const maxT = product.maxTermMonths;
  if (requestedAmount < minA || requestedAmount > maxA)
    return { error: `Amount must be between ${minA} and ${maxA}` };
  if (requestedTermMonths < minT || requestedTermMonths > maxT)
    return { error: `Term must be between ${minT} and ${maxT} months` };

  let appNumber = generateApplicationNumber();
  let exists = await prisma.loanApplication.findUnique({ where: { applicationNumber: appNumber } });
  while (exists) {
    appNumber = generateApplicationNumber();
    exists = await prisma.loanApplication.findUnique({ where: { applicationNumber: appNumber } });
  }

  const appliedDate = new Date();

  const application = await prisma.loanApplication.create({
    data: {
      applicationNumber: appNumber,
      clientId,
      loanProductId,
      requestedAmount: new Decimal(requestedAmount),
      requestedTermMonths,
      purpose,
      guarantorName,
      guarantorPhone,
      guarantorIdNumber,
      agentRecommendation,
      applicationStatus: "pending",
      appliedDate,
    },
    include: {
      client: { include: { user: true, agent: { include: { user: true } } } },
    },
  });

  const amountStr = requestedAmount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const clientUserId = application.client.userId;
  const clientName = `${application.client.user.firstName ?? ""} ${application.client.user.lastName ?? ""}`.trim();

  const notifications: { userId: number; title: string; message: string }[] = [
    {
      userId: clientUserId,
      title: "Loan application submitted",
      message: `Your loan application for GHS ${amountStr} has been submitted and is under review. Application #${appNumber}.`,
    },
  ];

  if (application.client.agent?.userId) {
    notifications.push({
      userId: application.client.agent.userId,
      title: "Loan application submitted",
      message: `Loan application for GHS ${amountStr} has been submitted for client ${clientName}. Application #${appNumber}.`,
    });
  }

  const adminsAndManagers = await prisma.user.findMany({
    where: { role: { in: ["business_admin", "manager"] }, status: "active" },
    select: { id: true },
  });
  for (const u of adminsAndManagers) {
    if (u.id === userId) continue;
    notifications.push({
      userId: u.id,
      title: "New loan application",
      message: `New loan application for GHS ${amountStr} from ${clientName} requires review. Application #${appNumber}.`,
    });
  }

  await prisma.notification.createMany({
    data: notifications.map((n) => ({
      userId: n.userId,
      notificationType: "system_alert",
      title: n.title,
      message: n.message,
    })),
  });

  const smsUserIds = notifications.map((n) => n.userId);
  await sendSmsToUserIds(
    prisma,
    smsUserIds,
    `Loan application GHS ${amountStr} from ${clientName}. Ref: ${appNumber}. - The Determiners`
  );

  revalidatePath("/agent/applications");
  revalidatePath("/agent/applications/new");
  revalidatePath("/admin/applications");
  revalidatePath("/client/apply-loan");
  return { success: true, applicationNumber: appNumber };
}
