import { createHmac, timingSafeEqual } from "crypto";

const IMPERSONATE_EXPIRY_MS = 2 * 60 * 1000; // 2 minutes
const EXIT_IMPERSONATE_EXPIRY_MS = 8 * 60 * 60 * 1000; // 8 hours

function createSignedToken(userId: number, expiryMs: number): string {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) throw new Error("NEXTAUTH_SECRET is required for impersonation");
  const expiry = Date.now() + expiryMs;
  const payload = `${userId}:${expiry}`;
  const signature = createHmac("sha256", secret).update(payload).digest("hex");
  const payloadB64 = Buffer.from(payload, "utf8").toString("base64url");
  return `${payloadB64}.${signature}`;
}

/** Create a signed token for impersonating a user. Caller must verify admin before using. */
export function createImpersonationToken(userId: number): string {
  return createSignedToken(userId, IMPERSONATE_EXPIRY_MS);
}

/** Create a longer-lived token for exiting impersonation (restore admin session). */
export function createExitToken(userId: number): string {
  return createSignedToken(userId, EXIT_IMPERSONATE_EXPIRY_MS);
}

/** Verify token and return userId if valid. Returns null if invalid or expired. */
export function verifyImpersonationToken(token: string): number | null {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) return null;
  const dot = token.indexOf(".");
  if (dot === -1) return null;
  const payloadB64 = token.slice(0, dot);
  const signature = token.slice(dot + 1);
  let payload: string;
  try {
    payload = Buffer.from(payloadB64, "base64url").toString("utf8");
  } catch {
    return null;
  }
  const expectedSig = createHmac("sha256", secret).update(payload).digest("hex");
  if (expectedSig.length !== signature.length || !timingSafeEqual(Buffer.from(expectedSig), Buffer.from(signature))) {
    return null;
  }
  const [userIdStr, expiryStr] = payload.split(":");
  const userId = parseInt(userIdStr ?? "", 10);
  const expiry = parseInt(expiryStr ?? "", 10);
  if (isNaN(userId) || isNaN(expiry) || Date.now() > expiry) return null;
  return userId;
}
