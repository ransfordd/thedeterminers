"use server";

import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export type SendNotificationState = { success?: boolean; error?: string };

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

  const userId = parseInt((formData.get("userId") as string) ?? "0", 10);
  const notificationType = (formData.get("notificationType") as string) || "system_alert";
  const title = (formData.get("title") as string)?.trim();
  const message = (formData.get("message") as string)?.trim();

  if (!userId) return { error: "Select a recipient" };
  if (!title) return { error: "Title is required" };
  if (!message) return { error: "Message is required" };
  if (!NOTIFICATION_TYPES.includes(notificationType as (typeof NOTIFICATION_TYPES)[number])) {
    return { error: "Invalid notification type" };
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true },
  });
  if (!user) return { error: "Recipient not found" };

  await prisma.notification.create({
    data: {
      userId: user.id,
      notificationType: notificationType as (typeof NOTIFICATION_TYPES)[number],
      title,
      message,
    },
  });

  revalidatePath("/admin/notifications");
  revalidatePath("/admin/notifications/send");
  return { success: true };
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
