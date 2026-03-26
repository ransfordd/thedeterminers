/**
 * SMS via Arkesel API.
 * Set ARKESEL_API_KEY and ARKESEL_SENDER_ID in env. If unset, sends are no-ops.
 * Respects system setting sms_enabled (when false, no SMS is sent).
 */

import type { PrismaClient } from "@prisma/client";
import { getBusinessInfoFromDb } from "@/lib/business-settings";
import { isSmsEnabled } from "@/lib/system-settings";

const ARKESEL_URL = "https://sms.arkesel.com/api/v2/sms/send";
const GHANA_PREFIX = "233";
const GHANA_LOCAL_LENGTH = 9;
const REQUEST_TIMEOUT_MS = 20_000;
const MAX_ATTEMPTS = 2;
const DEFAULT_SMS_BRAND = "The Determiners";

type PremiumSmsInput = {
  clientName?: string | null;
  eventLine: string;
  reference?: string | null;
  date?: Date;
  balanceLine?: string | null;
};

type RichSusuSmsInput = {
  clientName?: string | null;
  amount: string;
  reference: string;
  date: Date;
  cycleProgress?: string | null;
  totalCyclePaid?: string | null;
  savingsBalance?: string | null;
  collectedBy?: string | null;
};

type RichCycleSmsInput = {
  clientName?: string | null;
  primaryEventLine: string;
  reference: string;
  date: Date;
  cycleProgress?: string | null;
  totalCyclePaid?: string | null;
  savingsBalance?: string | null;
  collectedBy?: string | null;
};

function getEnvTrimmed(name: "ARKESEL_API_KEY" | "ARKESEL_SENDER_ID"): string {
  return (process.env[name] ?? "").trim();
}

function formatSmsDate(date: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Africa/Accra",
    hour12: true,
  }).format(date);
}

async function getSupportContact(): Promise<string> {
  const info = await getBusinessInfoFromDb();
  const supportPhone = (info.supportPhone ?? "").trim();
  const businessPhone = (info.phone ?? "").trim();
  return supportPhone || businessPhone || DEFAULT_SMS_BRAND;
}

export async function buildPremiumSms(input: PremiumSmsInput): Promise<string> {
  const supportContact = await getSupportContact();
  const clientName = (input.clientName ?? "Client").trim() || "Client";
  const lines = [
    `Dear ${clientName},`,
    input.eventLine,
    input.reference ? `Reference: ${input.reference}` : null,
    `Date: ${formatSmsDate(input.date ?? new Date())}`,
    input.balanceLine?.trim() ? input.balanceLine.trim() : null,
    `If this was not authorized, contact support: ${supportContact}.`,
    `- ${DEFAULT_SMS_BRAND}`,
  ].filter((line): line is string => Boolean(line));
  return lines.join(" ");
}

export async function buildRichCycleSms(input: RichCycleSmsInput): Promise<string> {
  const supportContact = await getSupportContact();
  const clientName = (input.clientName ?? "Client").trim() || "Client";
  const baseBlock = [
    `Dear ${clientName} ,`,
    input.primaryEventLine,
    `Reference: ${input.reference}`,
    `Date: ${formatSmsDate(input.date)}`,
    `If this was not authorized, contact support: ${supportContact}.`,
    `- ${DEFAULT_SMS_BRAND}`,
  ].join(" ");

  const optionalLines: string[] = [];
  if (input.cycleProgress) optionalLines.push(`Cycle progress: ${input.cycleProgress}`);
  if (input.totalCyclePaid) optionalLines.push(`Total amount paid: ${input.totalCyclePaid}`);
  if (input.savingsBalance) optionalLines.push(`Savings account balance: ${input.savingsBalance}`);
  if (input.collectedBy) optionalLines.push(`Agent collected: ${input.collectedBy}`);

  if (optionalLines.length === 0) return baseBlock;
  return `${baseBlock}\n\n${optionalLines.join("\n")}`;
}

export async function buildRichSusuSms(input: RichSusuSmsInput): Promise<string> {
  return buildRichCycleSms({
    clientName: input.clientName,
    primaryEventLine: `Susu collection of GHS ${input.amount} has been recorded.`,
    reference: input.reference,
    date: input.date,
    cycleProgress: input.cycleProgress,
    totalCyclePaid: input.totalCyclePaid,
    savingsBalance: input.savingsBalance,
    collectedBy: input.collectedBy,
  });
}

/** Normalize to 233XXXXXXXXX (Ghana). */
export function normalizePhone(phone: string): string | null {
  const digits = phone.replace(/\D/g, "");
  let normalized: string | null = null;
  if (digits.length === 12 && digits.startsWith(GHANA_PREFIX)) normalized = digits;
  else if (digits.length === 10 && digits.startsWith("0")) normalized = GHANA_PREFIX + digits.slice(1);
  else if (digits.length === GHANA_LOCAL_LENGTH) normalized = GHANA_PREFIX + digits;
  if (!normalized) return null;
  if (normalized.length !== 12 || !normalized.startsWith(GHANA_PREFIX)) return null;
  return normalized;
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
  const apiKey = getEnvTrimmed("ARKESEL_API_KEY");
  const sender = getEnvTrimmed("ARKESEL_SENDER_ID");
  if (!apiKey || !sender) {
    console.warn("[SMS] Skipped: ARKESEL_API_KEY or ARKESEL_SENDER_ID is missing/blank after trimming.");
    return false;
  }

  const invalidPhones: string[] = [];
  const normalized = recipients.map((p) => {
    const value = normalizePhone(p);
    if (!value) invalidPhones.push(p);
    return value;
  }).filter((p): p is string => p !== null);
  const uniqueNormalized = [...new Set(normalized)];
  if (invalidPhones.length > 0) {
    console.warn("[SMS] Skipped invalid phone(s):", invalidPhones.length);
  }
  console.info("[SMS] Preparing send", {
    recipientsInput: recipients.length,
    normalizedRecipients: uniqueNormalized.length,
    invalidRecipients: invalidPhones.length,
  });
  if (uniqueNormalized.length === 0) return true;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
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
          recipients: uniqueNormalized,
        }),
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!res.ok) {
        const body = await res.text();
        console.error("[SMS] Arkesel API rejection", {
          attempt,
          status: res.status,
          body: body.slice(0, 500),
        });
        return false;
      }
      console.info("[SMS] Provider accepted request", {
        attempt,
        recipients: uniqueNormalized.length,
      });
      return true;
    } catch (e) {
      clearTimeout(timeout);
      const err = e as Error & { cause?: { code?: string } };
      const errorCode =
        err.name === "AbortError" ? "ABORT_TIMEOUT" : err.cause?.code ?? "UNKNOWN";
      console.error("[SMS] Request failed", {
        attempt,
        maxAttempts: MAX_ATTEMPTS,
        errorName: err.name,
        errorCode,
        errorMessage: err.message,
      });
      if (attempt === MAX_ATTEMPTS) return false;
      await new Promise((resolve) => setTimeout(resolve, 500 * attempt));
    }
  }
  return false;
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
    let invalidCount = 0;
    for (const u of users) {
      let phone = (u.phone ?? "").trim();
      if (!phone) {
        const client = clientByUserId.get(u.id);
        phone = (client?.emergencyContactPhone ?? client?.nextOfKinPhone ?? "").trim();
      }
      if (phone) {
        const normalized = normalizePhone(phone);
        if (normalized) {
          phones.push(normalized);
        } else {
          invalidCount += 1;
        }
      }
    }
    const uniquePhones = [...new Set(phones)]; // avoid duplicate SMS to same number
    console.info("[SMS] Recipient resolution", {
      requestedUserIds: userIds.length,
      eligibleClients: users.length,
      uniquePhones: uniquePhones.length,
      invalidPhones: invalidCount,
    });
    if (uniquePhones.length > 0) {
      const sent = await sendSms(uniquePhones, message);
      if (sent) console.info("[SMS] Sent to", uniquePhones.length, "recipient(s).");
    }
  } catch (e) {
    console.error("[SMS] sendSmsToUserIds error:", e);
  }
}
