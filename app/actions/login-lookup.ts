"use server";

import { findActiveUsersByPhone } from "@/lib/login-phone";
import type { LoginAccountOption } from "@/lib/login-phone";
import { isPhoneLikeIdentifier } from "@/lib/phone-format";

export type LoginLookupState = {
  accounts?: LoginAccountOption[];
  error?: string;
};

const LOOKUP_LIMIT = 30;
const LOOKUP_WINDOW_MS = 60_000;
const lookupHits = new Map<string, { count: number; resetAt: number }>();

function rateLimitKey(phone: string): string {
  return phone.trim().toLowerCase();
}

function checkRateLimit(key: string): boolean {
  const now = Date.now();
  const row = lookupHits.get(key);
  if (!row || now >= row.resetAt) {
    lookupHits.set(key, { count: 1, resetAt: now + LOOKUP_WINDOW_MS });
    return true;
  }
  if (row.count >= LOOKUP_LIMIT) return false;
  row.count += 1;
  return true;
}

/** List active accounts for a phone number (login account picker). */
export async function lookupLoginAccountsByPhone(phone: string): Promise<LoginLookupState> {
  const trimmed = phone.trim();
  if (!trimmed) return { error: "Enter a phone number." };
  if (!isPhoneLikeIdentifier(trimmed)) {
    return { accounts: [] };
  }
  if (!checkRateLimit(rateLimitKey(trimmed))) {
    return { error: "Too many attempts. Please wait a moment and try again." };
  }

  const accounts = await findActiveUsersByPhone(trimmed);
  return { accounts };
}
