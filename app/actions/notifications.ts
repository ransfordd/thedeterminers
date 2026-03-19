"use server";

import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { UserRole } from "@prisma/client";

export type SendNotificationState = { success?: boolean; error?: string; sentCount?: number };

const RECIPIENT_SCOPES = ["single", "all_active_users", "all_agents", "all_clients"] as const;
type RecipientScope = (typeof RECIPIENT_SCOPES)[number];

const CREATE_MANY_CHUNK = 500;

const NOTIFICATION_TYPES = [
  "system_alert",
  "payment_due",
  "payment_overdue",
  "payment_recorded",
  "loan_approved",
  "loan_rejected",
  "cycle_completed",
] as const;

export async function sendNotification(
  _prev: SendNotificationState,
  formData: FormData
): Promise<SendNotificationState> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return { error: "Not authenticated" };
  const role = (session.user as { role?: string }).role;
  if (role !== "business_admin" && role !== "manager") return { error: "Not authorized" };

  const rawScope = (formData.get("recipientScope") as string) || "single";
  const recipientScope = (RECIPIENT_SCOPES.includes(rawScope as RecipientScope)
    ? rawScope
    : "single") as RecipientScope;

  const userId = parseInt((formData.get("userId") as string) ?? "0", 10);
  const notificationType = (formData.get("notificationType") as string) || "system_alert";
  const title = (formData.get("title") as string)?.trim();
  const message = (formData.get("message") as string)?.trim();

  if (!title) return { error: "Title is required" };
  if (!message) return { error: "Message is required" };
  if (!NOTIFICATION_TYPES.includes(notificationType as (typeof NOTIFICATION_TYPES)[number])) {
    return { error: "Invalid notification type" };
  }

  const notificationTypeTyped = notificationType as (typeof NOTIFICATION_TYPES)[number];

  let targetUserIds: number[] = [];

  if (recipientScope === "single") {
    if (!userId) return { error: "Select a recipient" };
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });
    if (!user) return { error: "Recipient not found" };
    targetUserIds = [user.id];
  } else if (recipientScope === "all_active_users") {
    const rows = await prisma.user.findMany({
      where: { status: "active" },
      select: { id: true },
    });
    targetUserIds = rows.map((r) => r.id);
  } else if (recipientScope === "all_agents") {
    const rows = await prisma.user.findMany({
      where: { status: "active", role: UserRole.agent },
      select: { id: true },
    });
    targetUserIds = rows.map((r) => r.id);
  } else if (recipientScope === "all_clients") {
    const rows = await prisma.user.findMany({
      where: { status: "active", role: UserRole.client },
      select: { id: true },
    });
    targetUserIds = rows.map((r) => r.id);
  } else {
    return { error: "Invalid recipient selection" };
  }

  if (targetUserIds.length === 0) {
    return { error: "No active users match this selection" };
  }

  const rows = targetUserIds.map((uid) => ({
    userId: uid,
    notificationType: notificationTypeTyped,
    title,
    message,
  }));

  for (let i = 0; i < rows.length; i += CREATE_MANY_CHUNK) {
    await prisma.notification.createMany({ data: rows.slice(i, i + CREATE_MANY_CHUNK) });
  }

  revalidatePath("/admin/notifications");
  revalidatePath("/admin/notifications/send");
  revalidatePath("/manager/notifications");
  return { success: true, sentCount: targetUserIds.length };
}

export async function markAllNotificationsRead(): Promise<{ success?: boolean; error?: string }> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return { error: "Not authenticated" };

  const userId = parseInt((session.user as { id?: string }).id ?? "0", 10);
  if (!userId) return { error: "Invalid session" };

  await prisma.notification.updateMany({
    where: { userId },
    data: { isRead: true },
  });

  revalidatePath("/", "layout");
  revalidatePath("/admin");
  revalidatePath("/manager");
  revalidatePath("/agent");
  revalidatePath("/client");
  return { success: true };
}
