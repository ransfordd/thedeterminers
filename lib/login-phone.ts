import type { PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/db";
import { phoneMatchVariants, userMatchesIdentifier } from "@/lib/phone-format";
import { publicProfileImageUrl } from "@/lib/profile-image-url";

export type LoginAccountOption = {
  id: number;
  firstName: string;
  lastName: string;
  username: string;
  role: string;
  profileImage: string | null;
};

export { phoneMatchVariants, storagePhone, isPhoneLikeIdentifier, userMatchesIdentifier } from "@/lib/phone-format";

export async function findActiveUsersByPhone(
  input: string,
  db: PrismaClient = prisma,
): Promise<LoginAccountOption[]> {
  const variants = phoneMatchVariants(input);
  if (variants.length === 0) return [];

  const users = await db.user.findMany({
    where: {
      status: "active",
      phone: { in: variants },
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      username: true,
      role: true,
      profileImage: true,
    },
    orderBy: [{ firstName: "asc" }, { lastName: "asc" }, { id: "asc" }],
  });

  return users.map((u) => ({
    id: u.id,
    firstName: u.firstName,
    lastName: u.lastName,
    username: u.username,
    role: u.role,
    profileImage: publicProfileImageUrl(u.profileImage),
  }));
}
