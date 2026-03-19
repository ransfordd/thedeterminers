import { prisma } from "@/lib/db";

export type LogActivityOptions = {
  referenceId?: number;
  referenceType?: string;
  ipAddress?: string;
  userAgent?: string;
};

/**
 * Log a user activity to the user_activity table. Fire-and-forget: never throws.
 * Used for dashboard User Activity Log and full log page.
 */
export async function logActivity(
  userId: number,
  activityType: string,
  activityDescription: string,
  options?: LogActivityOptions
): Promise<void> {
  try {
    await prisma.userActivity.create({
      data: {
        userId,
        activityType,
        activityDescription,
        referenceId: options?.referenceId ?? undefined,
        referenceType: options?.referenceType ?? undefined,
        ipAddress: options?.ipAddress ?? undefined,
        userAgent: options?.userAgent ?? undefined,
      },
    });
  } catch {
    /* do not break login or other flows */
  }
}
