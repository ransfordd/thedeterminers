import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";

export type NotificationDetail = {
  id: number;
  userId: number;
  title: string;
  message: string;
  notificationType: string;
  isRead: boolean;
  createdAt: Date;
  readAt: Date | null;
};

/**
 * Load a notification if the viewer may see it. Marks read when the viewer is the recipient.
 * business_admin may view any row; other roles only their own userId.
 */
export async function getNotificationForViewer(
  id: number,
  viewer: { userId: number; role: string }
): Promise<NotificationDetail | null> {
  if (!Number.isFinite(id) || id <= 0) return null;

  const n = await prisma.notification.findUnique({
    where: { id },
    select: {
      id: true,
      userId: true,
      title: true,
      message: true,
      notificationType: true,
      isRead: true,
      createdAt: true,
      readAt: true,
    },
  });
  if (!n) return null;

  const isAdmin = viewer.role === "business_admin";
  const isOwner = viewer.userId > 0 && n.userId === viewer.userId;
  if (!isAdmin && !isOwner) return null;

  if (isOwner && !n.isRead) {
    const readAt = new Date();
    await prisma.notification.update({
      where: { id },
      data: { isRead: true, readAt },
    });
    revalidatePath("/", "layout");
    return {
      ...n,
      notificationType: String(n.notificationType),
      isRead: true,
      readAt,
    };
  }

  return {
    ...n,
    notificationType: String(n.notificationType),
  };
}
