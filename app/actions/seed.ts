"use server";

import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { runSeed } from "@/lib/seed-runner";

export type RunSeedState = { success?: boolean; error?: string };

export async function runSeedNow(_prev: RunSeedState): Promise<RunSeedState> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return { error: "Not authenticated" };
  const role = (session.user as { role?: string }).role;
  if (role !== "business_admin") return { error: "Only administrators can run seed." };

  try {
    await runSeed(prisma);
    revalidatePath("/admin/settings");
    return { success: true };
  } catch (e) {
    console.error("Seed error:", e);
    return { error: e instanceof Error ? e.message : "Seed failed." };
  }
}
