import { prisma } from "@/lib/db";

export const INACTIVE_CLIENT_MESSAGE =
  "This client is inactive; transactions cannot be recorded.";

/** Returns an error message if the client cannot receive transactions, else null. */
export async function assertClientActiveForTransactions(clientId: number): Promise<string | null> {
  const c = await prisma.client.findUnique({
    where: { id: clientId },
    select: { status: true },
  });
  if (!c) return "Client not found";
  if (c.status !== "active") return INACTIVE_CLIENT_MESSAGE;
  return null;
}
