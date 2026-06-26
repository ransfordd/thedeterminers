const GHANA_PREFIX = "233";
const GHANA_LOCAL_LENGTH = 9;

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

/** Values stored or matched against User.phone for a given input. */
export function phoneMatchVariants(input: string): string[] {
  const trimmed = input.trim();
  if (!trimmed) return [];
  const variants = new Set<string>([trimmed]);
  const normalized = normalizePhone(trimmed);
  if (normalized) {
    variants.add(normalized);
    if (normalized.startsWith("233") && normalized.length === 12) {
      variants.add(`0${normalized.slice(3)}`);
    }
  }
  return [...variants];
}

/** Prefer normalized Ghana format for storage; fall back to trimmed raw input. */
export function storagePhone(phone: string): string {
  const trimmed = phone.trim();
  if (!trimmed) return trimmed;
  return normalizePhone(trimmed) ?? trimmed;
}

/** True when the login identifier is a phone number, not email/username. */
export function isPhoneLikeIdentifier(input: string): boolean {
  const trimmed = input.trim();
  if (!trimmed || trimmed.includes("@")) return false;
  if (normalizePhone(trimmed)) return true;
  const digits = trimmed.replace(/\D/g, "");
  return digits.length >= 9 && digits.length <= 15 && /^[\d\s+\-().]+$/.test(trimmed);
}

export function userMatchesIdentifier(
  user: { phone: string; email: string; username: string },
  input: string,
): boolean {
  const trimmed = input.trim();
  if (!trimmed) return false;
  if (user.email.toLowerCase() === trimmed.toLowerCase()) return true;
  if (user.username.toLowerCase() === trimmed.toLowerCase()) return true;
  const variants = phoneMatchVariants(trimmed);
  return variants.includes(user.phone);
}
