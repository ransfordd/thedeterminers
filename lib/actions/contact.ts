"use server";

import { z } from "zod";

const contactSchema = z.object({
  name: z.string().min(1, "Full name is required").max(100),
  email: z.string().email("Invalid email"),
  phone: z.string().max(30).optional(),
  subject: z.string().min(1, "Please select a subject").max(50),
  message: z.string().min(1, "Message is required").max(5000),
});

export type ContactState = { ok: boolean; error?: string };

export async function submitContact(prev: ContactState | null, formData: FormData): Promise<ContactState> {
  const parsed = contactSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone") || undefined,
    subject: formData.get("subject"),
    message: formData.get("message"),
  });

  if (!parsed.success) {
    const first = parsed.error.flatten().fieldErrors;
    const msg = Object.values(first).flat().join(" ") || "Invalid input.";
    return { ok: false, error: msg };
  }

  // Stub: in production, send email or store in DB
  // e.g. await sendEmail(parsed.data);
  return { ok: true };
}
