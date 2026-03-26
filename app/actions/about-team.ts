"use server";

import { mkdir, unlink, writeFile } from "fs/promises";
import path from "path";
import { getServerSession } from "next-auth";
import { revalidatePath, revalidateTag } from "next/cache";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

const UPLOAD_SUBDIR = "about-team";
const PUBLIC_PREFIX = `/uploads/${UPLOAD_SUBDIR}/`;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/gif", "image/webp"]);
const MAX_BYTES = 5 * 1024 * 1024;

export type AboutTeamActionState = { success?: boolean; error?: string };

function canEdit(role: string | undefined) {
  return role === "business_admin" || role === "manager";
}

async function assertEditor() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return { ok: false as const, error: "Not authenticated." };
  const role = (session.user as { role?: string }).role;
  if (!canEdit(role)) return { ok: false as const, error: "Not authorized." };
  return { ok: true as const };
}

function uploadDir() {
  return path.join(process.cwd(), "public", "uploads", UPLOAD_SUBDIR);
}

async function saveTeamPhoto(file: File): Promise<string | null> {
  if (!file || file.size === 0) return null;
  if (!ALLOWED_TYPES.has(file.type)) return null;
  if (file.size > MAX_BYTES) return null;
  const ext = path.extname(file.name) || ".jpg";
  const safeExt = /^\.[a-zA-Z0-9]+$/.test(ext) ? ext : ".jpg";
  const filename = `team_${Date.now()}_${Math.random().toString(36).slice(2, 10)}${safeExt}`;
  const dir = uploadDir();
  await mkdir(dir, { recursive: true });
  const buf = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(dir, filename), buf);
  return `${PUBLIC_PREFIX}${filename}`;
}

function isOurUpload(photoPath: string) {
  return photoPath.startsWith(PUBLIC_PREFIX);
}

async function removeUploadFile(photoPath: string) {
  if (!isOurUpload(photoPath)) return;
  const base = path.basename(photoPath);
  if (!base || base.includes("..") || base.includes("/") || base.includes("\\")) return;
  try {
    await unlink(path.join(uploadDir(), base));
  } catch {
    /* ignore */
  }
}

function revalidateAboutTeam() {
  revalidateTag("about-team", "max");
  revalidatePath("/about");
  revalidatePath("/admin/about-team");
}

export async function createAboutTeamMember(
  _prev: AboutTeamActionState,
  formData: FormData
): Promise<AboutTeamActionState> {
  const auth = await assertEditor();
  if (!auth.ok) return { error: auth.error };

  const name = String(formData.get("name") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const bio = String(formData.get("bio") ?? "").trim();
  const photoPathInput = String(formData.get("photoPath") ?? "").trim();
  const file = formData.get("photo") as File | null;

  if (!name || !title || !bio) return { error: "Name, job title, and bio are required." };

  let photoPath = photoPathInput;
  if (file && file.size > 0) {
    const saved = await saveTeamPhoto(file);
    if (!saved) return { error: "Invalid image. Use JPG, PNG, GIF, or WebP (max 5MB)." };
    photoPath = saved;
  }
  if (!photoPath) return { error: "Provide a photo file or a photo path (e.g. /assets/images/...)." };

  const maxRow = await prisma.aboutTeamMember.findFirst({
    orderBy: { sortOrder: "desc" },
    select: { sortOrder: true },
  });
  const sortOrder = (maxRow?.sortOrder ?? -1) + 1;

  await prisma.aboutTeamMember.create({
    data: { name, title, bio, photoPath, sortOrder },
  });

  revalidateAboutTeam();
  return { success: true };
}

export async function updateAboutTeamMember(
  _prev: AboutTeamActionState,
  formData: FormData
): Promise<AboutTeamActionState> {
  const auth = await assertEditor();
  if (!auth.ok) return { error: auth.error };

  const id = parseInt(String(formData.get("id") ?? "0"), 10);
  if (!id) return { error: "Invalid member." };

  const existing = await prisma.aboutTeamMember.findUnique({ where: { id } });
  if (!existing) return { error: "Member not found." };

  const name = String(formData.get("name") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const bio = String(formData.get("bio") ?? "").trim();
  const photoPathInput = String(formData.get("photoPath") ?? "").trim();
  const file = formData.get("photo") as File | null;

  if (!name || !title || !bio) return { error: "Name, job title, and bio are required." };

  let photoPath = existing.photoPath;
  if (file && file.size > 0) {
    const saved = await saveTeamPhoto(file);
    if (!saved) return { error: "Invalid image. Use JPG, PNG, GIF, or WebP (max 5MB)." };
    if (isOurUpload(existing.photoPath)) await removeUploadFile(existing.photoPath);
    photoPath = saved;
  } else if (photoPathInput) {
    if (isOurUpload(existing.photoPath) && photoPathInput !== existing.photoPath) {
      await removeUploadFile(existing.photoPath);
    }
    photoPath = photoPathInput;
  }

  await prisma.aboutTeamMember.update({
    where: { id },
    data: { name, title, bio, photoPath },
  });

  revalidateAboutTeam();
  return { success: true };
}

export async function deleteAboutTeamMember(formData: FormData): Promise<AboutTeamActionState> {
  const auth = await assertEditor();
  if (!auth.ok) return { error: auth.error };

  const id = parseInt(String(formData.get("id") ?? "0"), 10);
  if (!id) return { error: "Invalid member." };

  const existing = await prisma.aboutTeamMember.findUnique({ where: { id } });
  if (!existing) return { error: "Member not found." };

  await prisma.aboutTeamMember.delete({ where: { id } });
  if (isOurUpload(existing.photoPath)) await removeUploadFile(existing.photoPath);

  revalidateAboutTeam();
  return { success: true };
}

export async function reorderAboutTeamMember(formData: FormData): Promise<AboutTeamActionState> {
  const auth = await assertEditor();
  if (!auth.ok) return { error: auth.error };

  const id = parseInt(String(formData.get("id") ?? "0"), 10);
  const direction = String(formData.get("direction") ?? "");
  if (!id || (direction !== "up" && direction !== "down")) return { error: "Invalid request." };

  const list = await prisma.aboutTeamMember.findMany({
    orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
  });
  const idx = list.findIndex((m) => m.id === id);
  if (idx < 0) return { error: "Member not found." };
  const swapIdx = direction === "up" ? idx - 1 : idx + 1;
  if (swapIdx < 0 || swapIdx >= list.length) return { success: true };

  const a = list[idx];
  const b = list[swapIdx];
  await prisma.$transaction([
    prisma.aboutTeamMember.update({ where: { id: a.id }, data: { sortOrder: b.sortOrder } }),
    prisma.aboutTeamMember.update({ where: { id: b.id }, data: { sortOrder: a.sortOrder } }),
  ]);

  revalidateAboutTeam();
  return { success: true };
}
