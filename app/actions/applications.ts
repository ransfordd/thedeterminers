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

  const clientWithAgent = await prisma.client.findUnique({
    where: { id: application.clientId },
    select: { agent: { select: { userId: true } } },
  });
  const agentUserId = clientWithAgent?.agent?.userId ?? application.client.agent?.userId ?? null;
  if (agentUserId != null) {
    notifications.push({
      userId: agentUserId,
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
  revalidatePath("/admin/applications/new");
  revalidatePath("/client/apply-loan");
  return { success: true, applicationNumber: appNumber };
}

export type ReviewApplicationState = { success?: boolean; error?: string };

export async function approveLoanApplication(
  _prev: ReviewApplicationState,
  formData: FormData
): Promise<ReviewApplicationState> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return { error: "Not authenticated" };
  const role = (session.user as { role?: string }).role;
  if (role !== "business_admin" && role !== "manager") return { error: "Only admin or manager can approve applications." };

  const applicationId = parseInt(String(formData.get("applicationId") ?? "0"), 10);
  if (!applicationId) return { error: "Invalid application." };
  const reviewNotes = (formData.get("reviewNotes") as string)?.trim() || null;
  const approvedAmountRaw = (formData.get("approvedAmount") as string)?.trim();
  const approvedTermRaw = (formData.get("approvedTermMonths") as string)?.trim();

  const application = await prisma.loanApplication.findUnique({
    where: { id: applicationId },
    include: { client: { include: { user: true, agent: { include: { user: true } } } }, product: true },
  });
  if (!application) return { error: "Application not found." };
  if (application.applicationStatus !== "pending" && application.applicationStatus !== "under_review")
    return { error: "Application is no longer pending." };

  const approvedAmount = approvedAmountRaw ? parseFloat(approvedAmountRaw) : Number(application.requestedAmount);
  const approvedTermMonths = approvedTermRaw ? parseInt(approvedTermRaw, 10) : application.requestedTermMonths;
  const reviewerId = parseInt((session.user as { id?: string }).id ?? "0", 10);
  const now = new Date();

  await prisma.loanApplication.update({
    where: { id: applicationId },
    data: {
      applicationStatus: "approved",
      reviewedById: reviewerId,
      reviewDate: now,
      reviewNotes: reviewNotes ?? undefined,
      approvedAmount: new Decimal(approvedAmount),
      approvedTermMonths,
      approvalDate: now,
    },
  });

  const amountStr = approvedAmount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const clientName = `${application.client.user.firstName ?? ""} ${application.client.user.lastName ?? ""}`.trim();
  const appNumber = application.applicationNumber;

  const clientWithAgentForApproved = await prisma.client.findUnique({
    where: { id: application.clientId },
    select: { agent: { select: { userId: true } } },
  });
  const agentUserIdApproved = clientWithAgentForApproved?.agent?.userId ?? application.client.agent?.userId ?? null;

  const notifications: { userId: number; title: string; message: string }[] = [
    { userId: application.client.userId, title: "Loan approved", message: `Your loan application #${appNumber} has been approved for GHS ${amountStr}. - The Determiners` },
  ];
  if (agentUserIdApproved != null)
    notifications.push({ userId: agentUserIdApproved, title: "Loan approved", message: `Loan application #${appNumber} for ${clientName} has been approved for GHS ${amountStr}.` });
  const admins = await prisma.user.findMany({
    where: { role: { in: ["business_admin", "manager"] }, status: "active" },
    select: { id: true },
  });
  admins.forEach((u) => notifications.push({ userId: u.id, title: "Loan approved", message: `Loan application #${appNumber} for ${clientName} approved for GHS ${amountStr}.` }));

  await prisma.notification.createMany({
    data: notifications.map((n) => ({ userId: n.userId, notificationType: "system_alert", title: n.title, message: n.message })),
  });
  await sendSmsToUserIds(prisma, notifications.map((n) => n.userId), `Loan approved: ${clientName}, GHS ${amountStr}. Ref ${appNumber}. - The Determiners`);

  revalidatePath("/admin/applications");
  revalidatePath(`/admin/applications/${applicationId}`);
  revalidatePath("/agent/applications");
  revalidatePath("/client/apply-loan");
  return { success: true };
}

export async function rejectLoanApplication(
  _prev: ReviewApplicationState,
  formData: FormData
): Promise<ReviewApplicationState> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return { error: "Not authenticated" };
  const role = (session.user as { role?: string }).role;
  if (role !== "business_admin" && role !== "manager") return { error: "Only admin or manager can reject applications." };

  const applicationId = parseInt(String(formData.get("applicationId") ?? "0"), 10);
  if (!applicationId) return { error: "Invalid application." };
  const reviewNotes = (formData.get("reviewNotes") as string)?.trim() || null;

  const application = await prisma.loanApplication.findUnique({
    where: { id: applicationId },
    include: { client: { include: { user: true, agent: { include: { user: true } } } } },
  });
  if (!application) return { error: "Application not found." };
  if (application.applicationStatus !== "pending" && application.applicationStatus !== "under_review")
    return { error: "Application is no longer pending." };

  const reviewerId = parseInt((session.user as { id?: string }).id ?? "0", 10);
  const now = new Date();

  await prisma.loanApplication.update({
    where: { id: applicationId },
    data: {
      applicationStatus: "rejected",
      reviewedById: reviewerId,
      reviewDate: now,
      reviewNotes: reviewNotes ?? undefined,
    },
  });

  const clientName = `${application.client.user.firstName ?? ""} ${application.client.user.lastName ?? ""}`.trim();
  const appNumber = application.applicationNumber;

  const clientWithAgentForRejected = await prisma.client.findUnique({
    where: { id: application.clientId },
    select: { agent: { select: { userId: true } } },
  });
  const agentUserIdRejected = clientWithAgentForRejected?.agent?.userId ?? application.client.agent?.userId ?? null;

  const notifications: { userId: number; title: string; message: string }[] = [
    { userId: application.client.userId, title: "Loan application declined", message: `Your loan application #${appNumber} has been declined. ${reviewNotes ? reviewNotes : ""}`.trim() },
  ];
  if (agentUserIdRejected != null)
    notifications.push({ userId: agentUserIdRejected, title: "Loan application declined", message: `Loan application #${appNumber} for ${clientName} has been declined.` });
  const admins = await prisma.user.findMany({
    where: { role: { in: ["business_admin", "manager"] }, status: "active" },
    select: { id: true },
  });
  admins.forEach((u) => notifications.push({ userId: u.id, title: "Loan application declined", message: `Loan application #${appNumber} for ${clientName} was declined.` }));

  await prisma.notification.createMany({
    data: notifications.map((n) => ({ userId: n.userId, notificationType: "system_alert", title: n.title, message: n.message })),
  });
  await sendSmsToUserIds(prisma, notifications.map((n) => n.userId), `Loan application #${appNumber} for ${clientName} has been declined. - The Determiners`);

  revalidatePath("/admin/applications");
  revalidatePath(`/admin/applications/${applicationId}`);
  revalidatePath("/agent/applications");
  revalidatePath("/client/apply-loan");
  return { success: true };
}
