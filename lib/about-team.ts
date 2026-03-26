import { unstable_cache } from "next/cache";

/** Public shape for About page cards (DB or fallback). */
export type AboutTeamMemberPublic = {
  id: number;
  photoPath: string;
  name: string;
  title: string;
  bio: string;
};

/** Legacy default when the `about_team_member` table is empty. */
export const DEFAULT_ABOUT_TEAM_MEMBERS: Omit<AboutTeamMemberPublic, "id">[] = [
  {
    photoPath: "/assets/images/About-side/man1.jpg",
    name: "Kwame Asante",
    title: "Chief Executive Officer",
    bio: "With over 15 years in financial services, Kwame leads our vision of making financial inclusion a reality for all Ghanaians.",
  },
  {
    photoPath: "/assets/images/About-side/man2.jpg",
    name: "Ama Serwaa",
    title: "Chief Technology Officer",
    bio: "Ama brings her expertise in fintech innovation to ensure our platform remains secure, user-friendly, and cutting-edge.",
  },
  {
    photoPath: "/assets/images/About-side/man3.jpg",
    name: "Kofi Mensah",
    title: "Head of Operations",
    bio: "Kofi ensures our operations run smoothly, maintaining the highest standards of service delivery and client satisfaction.",
  },
  {
    photoPath: "/assets/images/About-side/man4.jpg",
    name: "Efua Adjei",
    title: "Community Relations Manager",
    bio: "Efua builds and maintains relationships with our community partners, ensuring we stay connected to the people we serve.",
  },
];

export async function getAboutTeamMembers(): Promise<AboutTeamMemberPublic[]> {
  return unstable_cache(
    async (): Promise<AboutTeamMemberPublic[]> => {
      if (!process.env.DATABASE_URL?.trim()) {
        return DEFAULT_ABOUT_TEAM_MEMBERS.map((m, i) => ({
          id: -(i + 1),
          ...m,
        }));
      }
      try {
        const { prisma } = await import("@/lib/db");
        const rows = await prisma.aboutTeamMember.findMany({
          orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
        });
        if (rows.length === 0) {
          return DEFAULT_ABOUT_TEAM_MEMBERS.map((m, i) => ({
            id: -(i + 1),
            ...m,
          }));
        }
        return rows.map((r) => ({
          id: r.id,
          photoPath: r.photoPath,
          name: r.name,
          title: r.title,
          bio: r.bio,
        }));
      } catch {
        return DEFAULT_ABOUT_TEAM_MEMBERS.map((m, i) => ({
          id: -(i + 1),
          ...m,
        }));
      }
    },
    ["about-team-members"],
    { revalidate: 60, tags: ["about-team"] }
  )();
}
