"use server";

import { hash } from "bcryptjs";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { Decimal } from "@prisma/client/runtime/library";

export type SignupState = { error?: string };

export async function signupClient(prev: SignupState, formData: FormData): Promise<SignupState> {
  const firstName = (formData.get("first_name") as string)?.trim();
  const lastName = (formData.get("last_name") as string)?.trim();
  const username = (formData.get("username") as string)?.trim();
  const email = (formData.get("email") as string)?.trim();
  const password = formData.get("password") as string;
  const phone = (formData.get("phone") as string)?.trim();
  const dateOfBirth = (formData.get("date_of_birth") as string) || null;
  const gender = (formData.get("gender") as string) || null;
  const maritalStatus = (formData.get("marital_status") as string) || null;
  const nationality = (formData.get("nationality") as string) || null;
  const residentialAddress = (formData.get("residential_address") as string)?.trim() || null;
  const city = (formData.get("city") as string)?.trim() || null;
  const region = (formData.get("region") as string) || null;
  const postalCode = (formData.get("postal_code") as string)?.trim() || null;
  const nextOfKinName = (formData.get("next_of_kin_name") as string)?.trim();
  const nextOfKinRelationship = (formData.get("next_of_kin_relationship") as string)?.trim();
  const nextOfKinPhone = (formData.get("next_of_kin_phone") as string)?.trim();
  const nextOfKinEmail = (formData.get("next_of_kin_email") as string)?.trim() || null;
  const nextOfKinAddress = (formData.get("next_of_kin_address") as string)?.trim();
  const agentId = parseInt((formData.get("agent_id") as string) ?? "0", 10);
  const depositType = (formData.get("deposit_type") as string) === "flexible_amount" ? "flexible_amount" : "fixed_amount";
  const dailyDepositAmount = depositType === "fixed_amount"
    ? parseFloat((formData.get("daily_deposit_amount") as string) ?? "0") || 20
    : 0;

  if (!firstName || !lastName) return { error: "First name and last name are required." };
  if (!username) return { error: "Username is required." };
  if (!email) return { error: "Email is required." };
  if (!password || password.length < 8) return { error: "Password must be at least 8 characters." };
  if (!phone) return { error: "Phone number is required." };
  if (!nextOfKinName || !nextOfKinRelationship || !nextOfKinPhone || !nextOfKinAddress) {
    return { error: "Next of Kin information (name, relationship, phone, address) is required." };
  }
  if (!agentId) return { error: "Please select an agent." };

  const existingUser = await prisma.user.findFirst({
    where: { OR: [{ email }, { username }] },
  });
  if (existingUser) return { error: "Username or email already registered." };

  const agent = await prisma.agent.findFirst({
    where: { id: agentId, status: "active" },
  });
  if (!agent) return { error: "Selected agent is not valid." };

  const passwordHash = await hash(password, 10);

  try {
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          username,
          email,
          passwordHash,
          role: "client",
          firstName,
          lastName,
          phone: phone || "N/A",
          address: residentialAddress ?? undefined,
          postalAddress: residentialAddress ?? undefined,
          city: city ?? undefined,
          region: region ?? undefined,
          postalCode: postalCode ?? undefined,
          dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
          gender: gender || undefined,
          maritalStatus: maritalStatus || undefined,
          nationality: nationality || undefined,
          status: "active",
        },
      });

      const clientCode = "CL" + String(user.id).padStart(4, "0");
      await tx.client.create({
        data: {
          userId: user.id,
          agentId,
          clientCode,
          dailyDepositAmount: new Decimal(dailyDepositAmount),
          depositType,
          nextOfKinName,
          nextOfKinRelationship,
          nextOfKinPhone,
          nextOfKinEmail: nextOfKinEmail || undefined,
          nextOfKinAddress,
          registrationDate: new Date(),
          status: "active",
        },
      });

      return { userId: user.id };
    });

    revalidatePath("/signup");
    revalidatePath("/login");
    redirect("/login?success=1");
  } catch (e) {
    if (e && typeof e === "object" && (e as { digest?: string }).digest?.startsWith("NEXT_REDIRECT")) throw e;
    console.error("Signup error:", e);
    return { error: "Registration failed. Please try again." };
  }
}
