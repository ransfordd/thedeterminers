"use server";

import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { hash, compare } from "bcryptjs";

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif"];
const MAX_IMAGE_SIZE = 2 * 1024 * 1024; // 2MB

export type AccountProfileState = { success?: boolean; error?: string };
export type ChangePasswordState = { success?: boolean; error?: string };

export async function updateProfile(
  _prev: AccountProfileState,
  formData: FormData
): Promise<AccountProfileState> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return { error: "Not authenticated" };
  const userId = parseInt((session.user as { id?: string }).id ?? "0", 10);
  if (!userId) return { error: "Invalid user" };

  const firstName = (formData.get("firstName") as string)?.trim();
  const lastName = (formData.get("lastName") as string)?.trim();
  const email = (formData.get("email") as string)?.trim().toLowerCase();
  const phone = (formData.get("phone") as string)?.trim() ?? "";
  const address = (formData.get("address") as string)?.trim() || null;

  if (!firstName || !lastName) return { error: "First name and last name are required" };
  if (!email) return { error: "Email is required" };

  const existing = await prisma.user.findFirst({
    where: { email, id: { not: userId } },
  });
  if (existing) return { error: "Email is already in use by another account" };

  await prisma.user.update({
    where: { id: userId },
    data: { firstName, lastName, email, phone, address: address ?? undefined },
  });
  revalidatePath("/account/settings");
  revalidatePath("/dashboard");
  revalidatePath("/admin");
  revalidatePath("/manager");
  revalidatePath("/agent");
  revalidatePath("/client");
  return { success: true };
}

export async function changePassword(
  _prev: ChangePasswordState,
  formData: FormData
): Promise<ChangePasswordState> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return { error: "Not authenticated" };
  const userId = parseInt((session.user as { id?: string }).id ?? "0", 10);
  if (!userId) return { error: "Invalid user" };

  const currentPassword = formData.get("currentPassword") as string;
  const newPassword = formData.get("newPassword") as string;
  const confirmPassword = formData.get("confirmPassword") as string;

  if (!currentPassword || !newPassword || !confirmPassword)
    return { error: "All password fields are required" };
  if (newPassword.length < 6) return { error: "New password must be at least 6 characters" };
  if (newPassword !== confirmPassword) return { error: "New password and confirmation do not match" };

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return { error: "User not found" };
  const valid = await compare(currentPassword, user.passwordHash);
  if (!valid) return { error: "Current password is incorrect" };

  const passwordHash = await hash(newPassword, 12);
  await prisma.user.update({ where: { id: userId }, data: { passwordHash } });
  revalidatePath("/account/password");
  return { success: true };
}

export type ProfilePictureState = {
  success?: boolean;
  error?: string;
  /** Bumps on each success so client can call router.refresh() and show new image */
  updatedAt?: number;
};

export async function uploadProfilePicture(
  _prev: ProfilePictureState,
  formData: FormData
): Promise<ProfilePictureState> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return { error: "Not authenticated" };
  const userId = parseInt((session.user as { id?: string }).id ?? "0", 10);
  if (!userId) return { error: "Invalid user" };

  const file = formData.get("profile_picture") as File | null;
  if (!file || file.size === 0) return { error: "Please select an image file" };
  if (!ALLOWED_IMAGE_TYPES.includes(file.type))
    return { error: "Invalid file type. Use JPG, PNG, or GIF." };
  if (file.size > MAX_IMAGE_SIZE) return { error: "File must be 2MB or less." };

  try {
    const ext = path.extname(file.name) || ".jpg";
    const filename = `user_${userId}_${Date.now()}${ext}`;
    const dir = path.join(process.cwd(), "public", "uploads", "profiles");
    await mkdir(dir, { recursive: true });
    const filePath = path.join(dir, filename);
    const bytes = await file.arrayBuffer();
    await writeFile(filePath, Buffer.from(bytes));
    /** Use API route so images work with Next standalone / Docker (public/ alone may 404). */
    const publicPath = `/api/uploads/profiles/${encodeURIComponent(filename)}`;

    await prisma.user.update({
      where: { id: userId },
      data: { profileImage: publicPath },
    });
    revalidatePath("/account/settings");
    revalidatePath("/dashboard");
    revalidatePath("/admin");
    revalidatePath("/manager");
    revalidatePath("/agent");
    revalidatePath("/client");
    return { success: true, updatedAt: Date.now() };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to upload" };
  }
}

export async function removeProfilePicture(
  _prev: ProfilePictureState,
  _formData?: FormData
): Promise<ProfilePictureState> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return { error: "Not authenticated" };
  const userId = parseInt((session.user as { id?: string }).id ?? "0", 10);
  if (!userId) return { error: "Invalid user" };

  await prisma.user.update({
    where: { id: userId },
    data: { profileImage: null },
  });
  revalidatePath("/account/settings");
  revalidatePath("/dashboard");
  revalidatePath("/admin");
  revalidatePath("/manager");
  revalidatePath("/agent");
  revalidatePath("/client");
  return { success: true, updatedAt: Date.now() };
}

export type PersonalInfoState = { success?: boolean; error?: string };

export async function updatePersonalInfo(
  _prev: PersonalInfoState,
  formData: FormData
): Promise<PersonalInfoState> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return { error: "Not authenticated" };
  const userId = parseInt((session.user as { id?: string }).id ?? "0", 10);
  if (!userId) return { error: "Invalid user" };

  const middleName = (formData.get("middleName") as string)?.trim() || null;
  const dateOfBirthRaw = (formData.get("dateOfBirth") as string)?.trim() || null;
  const gender = (formData.get("gender") as string)?.trim() || null;
  const maritalStatus = (formData.get("maritalStatus") as string)?.trim() || null;
  const nationality = (formData.get("nationality") as string)?.trim() || null;
  const dateOfBirth = dateOfBirthRaw ? new Date(dateOfBirthRaw) : null;

  await prisma.user.update({
    where: { id: userId },
    data: {
      middleName: middleName ?? undefined,
      dateOfBirth,
      gender: gender ?? undefined,
      maritalStatus: maritalStatus ?? undefined,
      nationality: nationality ?? undefined,
    },
  });
  revalidatePath("/account/settings");
  revalidatePath("/dashboard");
  revalidatePath("/admin");
  revalidatePath("/manager");
  revalidatePath("/agent");
  revalidatePath("/client");
  return { success: true };
}

export type ContactInfoState = { success?: boolean; error?: string };

export async function updateContactInfo(
  _prev: ContactInfoState,
  formData: FormData
): Promise<ContactInfoState> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return { error: "Not authenticated" };
  const userId = parseInt((session.user as { id?: string }).id ?? "0", 10);
  if (!userId) return { error: "Invalid user" };

  const postalAddress = (formData.get("postalAddress") as string)?.trim() || null;
  const city = (formData.get("city") as string)?.trim() || null;
  const region = (formData.get("region") as string)?.trim() || null;
  const postalCode = (formData.get("postalCode") as string)?.trim() || null;

  await prisma.user.update({
    where: { id: userId },
    data: {
      postalAddress: postalAddress ?? undefined,
      city: city ?? undefined,
      region: region ?? undefined,
      postalCode: postalCode ?? undefined,
    },
  });
  revalidatePath("/account/settings");
  revalidatePath("/dashboard");
  revalidatePath("/admin");
  revalidatePath("/manager");
  revalidatePath("/agent");
  revalidatePath("/client");
  return { success: true };
}

export type NextOfKinState = { success?: boolean; error?: string };

export async function updateNextOfKin(
  _prev: NextOfKinState,
  formData: FormData
): Promise<NextOfKinState> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return { error: "Not authenticated" };
  const userId = parseInt((session.user as { id?: string }).id ?? "0", 10);
  if (!userId) return { error: "Invalid user" };

  const client = await prisma.client.findUnique({ where: { userId } });
  if (!client) return { error: "No client record found" };

  const name = (formData.get("nextOfKinName") as string)?.trim() || null;
  const relationship = (formData.get("nextOfKinRelationship") as string)?.trim() || null;
  const phone = (formData.get("nextOfKinPhone") as string)?.trim() || null;
  const email = (formData.get("nextOfKinEmail") as string)?.trim() || null;
  const address = (formData.get("nextOfKinAddress") as string)?.trim() || null;

  await prisma.client.update({
    where: { id: client.id },
    data: {
      nextOfKinName: name ?? undefined,
      nextOfKinRelationship: relationship ?? undefined,
      nextOfKinPhone: phone ?? undefined,
      nextOfKinEmail: email ?? undefined,
      nextOfKinAddress: address ?? undefined,
    },
  });
  revalidatePath("/account/settings");
  revalidatePath("/dashboard");
  revalidatePath("/admin");
  revalidatePath("/manager");
  revalidatePath("/agent");
  revalidatePath("/client");
  return { success: true };
}

const ALLOWED_DOC_TYPES = ["image/jpeg", "image/png", "image/gif", "application/pdf"];
const MAX_DOC_SIZE = 5 * 1024 * 1024; // 5MB

export type DocumentUploadState = { success?: boolean; error?: string };

export async function uploadDocument(
  _prev: DocumentUploadState,
  formData: FormData
): Promise<DocumentUploadState> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return { error: "Not authenticated" };
  const userId = parseInt((session.user as { id?: string }).id ?? "0", 10);
  if (!userId) return { error: "Invalid user" };

  const documentType = (formData.get("document_type") as string)?.trim();
  const description = (formData.get("description") as string)?.trim() || null;
  const file = formData.get("document_file") as File | null;

  if (!documentType) return { error: "Document type is required" };
  if (!file || file.size === 0) return { error: "Please select a file" };
  if (!ALLOWED_DOC_TYPES.includes(file.type))
    return { error: "Invalid file type. Use JPG, PNG, GIF, or PDF." };
  if (file.size > MAX_DOC_SIZE) return { error: "File must be 5MB or less." };

  try {
    const ext = path.extname(file.name) || ".pdf";
    const filename = `${documentType}_${Date.now()}_${userId}${ext}`;
    const dir = path.join(process.cwd(), "public", "uploads", "documents", String(userId));
    await mkdir(dir, { recursive: true });
    const filePath = path.join(dir, filename);
    const bytes = await file.arrayBuffer();
    await writeFile(filePath, Buffer.from(bytes));
    const publicPath = `/uploads/documents/${userId}/${filename}`;

    await prisma.userDocument.create({
      data: {
        userId,
        documentType,
        filePath: publicPath,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        description,
        status: "pending",
      },
    });
    revalidatePath("/account/settings");
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to upload document" };
  }
}

export async function deleteDocument(formData: FormData): Promise<DocumentUploadState> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return { error: "Not authenticated" };
  const userId = parseInt((session.user as { id?: string }).id ?? "0", 10);
  if (!userId) return { error: "Invalid user" };

  const id = parseInt(String(formData.get("documentId") ?? "0"), 10);
  if (!id) return { error: "Document not found" };

  const doc = await prisma.userDocument.findFirst({
    where: { id, userId },
  });
  if (!doc) return { error: "Document not found" };

  await prisma.userDocument.delete({ where: { id } });
  revalidatePath("/account/settings");
  return { success: true };
}
