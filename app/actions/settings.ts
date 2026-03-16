"use server";

import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export type UpdateSettingState = { success?: boolean; error?: string };

export async function updateSetting(
  _prev: UpdateSettingState,
  formData: FormData
): Promise<UpdateSettingState> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return { error: "Not authenticated" };
  const role = (session.user as { role?: string }).role;
  if (role !== "business_admin" && role !== "manager") return { error: "Not authorized" };

  const settingKey = (formData.get("settingKey") as string)?.trim();
  const settingValue = (formData.get("settingValue") as string)?.trim();

  if (!settingKey) return { error: "Setting key is required" };

  await prisma.systemSetting.update({
    where: { settingKey },
    data: { settingValue },
  });

  const adminManagerUsers = await prisma.user.findMany({
    where: { role: { in: ["business_admin", "manager"] }, status: "active" },
    select: { id: true },
  });
  if (adminManagerUsers.length > 0) {
    await prisma.notification.createMany({
      data: adminManagerUsers.map((u) => ({
        userId: u.id,
        notificationType: "system_alert",
        title: "System settings updated",
        message: `Setting "${settingKey}" was updated successfully.`,
      })),
    }).catch(() => { /* ignore */ });
  }

  revalidatePath("/admin/settings");
  revalidatePath("/admin");
  revalidatePath("/manager");
  revalidatePath("/agent");
  revalidatePath("/client");
  return { success: true };
}

export type UpdateBrandingState = { success?: boolean; error?: string };

const ALLOWED_LOGO_TYPES = ["image/jpeg", "image/png", "image/gif", "image/svg+xml"];
const MAX_LOGO_SIZE = 2 * 1024 * 1024; // 2MB

export async function updateBranding(
  _prev: UpdateBrandingState,
  formData: FormData
): Promise<UpdateBrandingState> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return { error: "Not authenticated" };
  const role = (session.user as { role?: string }).role;
  if (role !== "business_admin" && role !== "manager") return { error: "Not authorized" };

  const appName = (formData.get("app_name") as string)?.trim() || "The Determiners Susu System";

  try {
    await prisma.systemSetting.upsert({
      where: { settingKey: "app_name" },
      update: { settingValue: appName },
      create: {
        settingKey: "app_name",
        settingValue: appName,
        settingType: "string",
        category: "system",
        description: "Application name",
      },
    });

    const file = formData.get("app_logo") as File | null;
    if (file && file.size > 0) {
      if (!ALLOWED_LOGO_TYPES.includes(file.type))
        return { error: "Invalid file type. Use JPG, PNG, GIF, or SVG." };
      if (file.size > MAX_LOGO_SIZE) return { error: "Logo must be 2MB or less." };

      const ext = path.extname(file.name) || ".png";
      const filename = `logo_${Date.now()}${ext}`;
      const dir = path.join(process.cwd(), "public", "uploads", "logos");
      await mkdir(dir, { recursive: true });
      const filePath = path.join(dir, filename);
      const bytes = await file.arrayBuffer();
      await writeFile(filePath, Buffer.from(bytes));
      const publicPath = `/uploads/logos/${filename}`;

      await prisma.systemSetting.upsert({
        where: { settingKey: "app_logo" },
        update: { settingValue: publicPath },
        create: {
          settingKey: "app_logo",
          settingValue: publicPath,
          settingType: "string",
          category: "system",
          description: "Application logo path",
        },
      });
    }

    const adminManagerUsers = await prisma.user.findMany({
      where: { role: { in: ["business_admin", "manager"] }, status: "active" },
      select: { id: true },
    });
    if (adminManagerUsers.length > 0) {
      await prisma.notification.createMany({
        data: adminManagerUsers.map((u) => ({
          userId: u.id,
          notificationType: "system_alert",
          title: "Branding updated",
          message: "Application name and/or logo has been updated in system settings.",
        })),
      }).catch(() => { /* ignore */ });
    }

    revalidatePath("/admin/settings");
    revalidatePath("/admin");
    revalidatePath("/manager");
    revalidatePath("/agent");
    revalidatePath("/client");
    redirect("/admin/settings?success=1");
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to update branding" };
  }
}

export type AddHolidayState = { success?: boolean; error?: string };

export async function addHoliday(
  _prev: AddHolidayState,
  formData: FormData
): Promise<AddHolidayState> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return { error: "Not authenticated" };
  const role = (session.user as { role?: string }).role;
  if (role !== "business_admin" && role !== "manager") return { error: "Not authorized" };

  const name = (formData.get("holiday_name") as string)?.trim();
  const dateStr = formData.get("holiday_date") as string;
  const isRecurring = formData.get("is_recurring") === "on" || formData.get("is_recurring") === "1";

  if (!name || !dateStr) return { error: "Holiday name and date are required" };

  const userId = parseInt((session.user as { id?: string }).id ?? "0", 10);
  if (!userId) return { error: "Invalid user" };

  try {
    await prisma.holidaysCalendar.create({
      data: {
        holidayName: name,
        holidayDate: new Date(dateStr),
        isRecurring,
        holidayType: "national",
        createdById: userId,
      },
    });

    const adminManagerUsers = await prisma.user.findMany({
      where: { role: { in: ["business_admin", "manager"] }, status: "active" },
      select: { id: true },
    });
    if (adminManagerUsers.length > 0) {
      await prisma.notification.createMany({
        data: adminManagerUsers.map((u) => ({
          userId: u.id,
          notificationType: "system_alert",
          title: "Holiday added",
          message: `Holiday "${name}" (${new Date(dateStr).toLocaleDateString("en-GB")}) was added to the calendar.`,
        })),
      }).catch(() => { /* ignore */ });
    }

    revalidatePath("/admin/settings");
    redirect("/admin/settings?success=1");
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to add holiday" };
  }
}

export async function deleteHoliday(formData: FormData): Promise<{ error?: string }> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return { error: "Not authenticated" };
  const role = (session.user as { role?: string }).role;
  if (role !== "business_admin" && role !== "manager") return { error: "Not authorized" };

  const id = parseInt(String(formData.get("holidayId") ?? "0"), 10);
  if (!id) return { error: "Invalid holiday" };

  try {
    await prisma.holidaysCalendar.delete({ where: { id } });

    const adminManagerUsers = await prisma.user.findMany({
      where: { role: { in: ["business_admin", "manager"] }, status: "active" },
      select: { id: true },
    });
    if (adminManagerUsers.length > 0) {
      await prisma.notification.createMany({
        data: adminManagerUsers.map((u) => ({
          userId: u.id,
          notificationType: "system_alert",
          title: "Holiday removed",
          message: "A holiday was removed from the calendar.",
        })),
      }).catch(() => { /* ignore */ });
    }

    revalidatePath("/admin/settings");
    redirect("/admin/settings?success=1");
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to delete holiday" };
  }
}

export type SendNotificationState = { success?: boolean; error?: string };

const TARGET_ROLES = ["all", "agent", "client", "manager"] as const;
type TargetRole = (typeof TARGET_ROLES)[number];

function isValidTargetRole(r: string): r is TargetRole {
  return TARGET_ROLES.includes(r as TargetRole);
}

export async function sendNotification(
  _prev: SendNotificationState,
  formData: FormData
): Promise<SendNotificationState> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return { error: "Not authenticated" };
  const role = (session.user as { role?: string }).role;
  if (role !== "business_admin" && role !== "manager") return { error: "Not authorized" };

  const title = (formData.get("title") as string)?.trim();
  const message = (formData.get("message") as string)?.trim();
  const targetRole = formData.get("target_role") as string;

  if (!title || !message) return { error: "Title and message are required" };
  if (!isValidTargetRole(targetRole)) return { error: "Invalid target" };

  const where: { status?: "active"; role?: import("@prisma/client").UserRole } = { status: "active" };
  if (targetRole !== "all") where.role = targetRole as import("@prisma/client").UserRole;

  const users = await prisma.user.findMany({
    where,
    select: { id: true },
  });

  if (users.length === 0) {
    return { error: "No active users found for the selected target." };
  }

  try {
    await prisma.notification.createMany({
      data: users.map((u) => ({
        userId: u.id,
        notificationType: "system_alert",
        title,
        message,
        sentVia: "system",
      })),
    });
    revalidatePath("/admin/settings");
    redirect("/admin/settings?success=1");
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to send notification" };
  }
}
