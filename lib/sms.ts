/**
 * SMS via Arkesel API.
 * Set ARKESEL_API_KEY and ARKESEL_SENDER_ID in env. If unset, sends are no-ops.
 * Respects system setting sms_enabled (when false, no SMS is sent).
 */

import type { PrismaClient } from "@prisma/client";
import { isSmsEnabled } from "@/lib/system-settings";

const ARKESEL_URL = "https://sms.arkesel.com/api/v2/sms/send";

/** Normalize to 233XXXXXXXXX (Ghana). */
export function normalizePhone(phone: string): string | null {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 9) return null;
  if (digits.startsWith("233")) return digits.length >= 12 ? digits.slice(0, 12) : null;
  if (digits.startsWith("0")) return "233" + digits.slice(1);
  return "233" + digits.slice(-9);
}

/**
 * Send one SMS to many recipients via Arkesel.
 * Returns true if sent (or no recipients), false if API key/sender missing or request failed.
 */
export async function sendSms(recipients: string[], message: string): Promise<boolean> {
  const enabled = await isSmsEnabled();
  if (!enabled) {
    console.warn("[SMS] Skipped: SMS notifications are disabled in system settings.");
    return false;
  }
  const apiKey = process.env.ARKESEL_API_KEY;
  const sender = process.env.ARKESEL_SENDER_ID;
  if (!apiKey || !sender) {
    console.warn("[SMS] Skipped: set ARKESEL_API_KEY and ARKESEL_SENDER_ID in .env to enable SMS.");
    return false;
  }

  const normalized = recipients
    .map((p) => normalizePhone(p))
    .filter((p): p is string => p !== null);
  if (normalized.length === 0) return true;

  try {
    const res = await fetch(ARKESEL_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": apiKey,
      },
      body: JSON.stringify({
        sender,
        message: message.slice(0, 480),
        recipients: normalized,
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      console.error("[SMS] Arkesel API error:", res.status, body);
      return false;
    }
    return true;
  } catch (e) {
    console.error("[SMS] Request failed:", e);
    return false;
  }
}

/**
 * Send SMS to users by ID. Only active users with role `client` receive SMS; agent,
 * business_admin, and manager IDs are ignored. Uses User.phone; falls back to
 * Client.emergencyContactPhone or Client.nextOfKinPhone when User.phone is empty.
 * Fire-and-forget: errors are logged, not thrown.
 */
export async function sendSmsToUserIds(
  prisma: PrismaClient,
  userIds: number[],
  message: string
): Promise<void> {
  if (userIds.length === 0) return;
  const enabled = await isSmsEnabled();
  if (!enabled) return;
  try {
    const [users, clients] = await Promise.all([
      prisma.user.findMany({
        where: { id: { in: userIds }, status: "active", role: "client" },
        select: { id: true, phone: true },
      }),
      prisma.client.findMany({
        where: { userId: { in: userIds } },
        select: { userId: true, emergencyContactPhone: true, nextOfKinPhone: true },
      }),
    ]);
    const clientByUserId = new Map(clients.map((c) => [c.userId, c]));
    const phones: string[] = [];
    for (const u of users) {
      let phone = (u.phone ?? "").trim();
      if (!phone) {
        const client = clientByUserId.get(u.id);
        phone = (client?.emergencyContactPhone ?? client?.nextOfKinPhone ?? "").trim();
      }
      if (phone) {
        const normalized = normalizePhone(phone);
        if (normalized) phones.push(normalized);
      }
    }
    const uniquePhones = [...new Set(phones)]; // avoid duplicate SMS to same number
    if (uniquePhones.length > 0) {
      const sent = await sendSms(uniquePhones, message);
      if (sent) console.info("[SMS] Sent to", uniquePhones.length, "recipient(s).");
    }
  } catch (e) {
    console.error("[SMS] sendSmsToUserIds error:", e);
  }
}
