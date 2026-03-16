import { prisma } from "@/lib/db";

export interface DashboardNotification {
  id: number;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: Date;
}

export async function getRecentNotifications(
  userId: number,
  limit = 10
): Promise<DashboardNotification[]> {
  const rows = await prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      title: true,
      message: true,
      isRead: true,
      createdAt: true,
    },
  });
  return rows;
}

export async function getUnreadNotificationCount(userId: number): Promise<number> {
  return prisma.notification.count({
    where: { userId, isRead: false },
  });
}
