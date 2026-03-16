"use server";

import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

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
