import { unstable_cache } from "next/cache";

/** Keys used by system (non-business) settings. Business keys are in business-settings.ts. */
const SYSTEM_SETTING_KEYS = [
  "currency",
  "currency_rate_from_ghs",
  "currency_rate_usd_per_ghs",
  "currency_rate_eur_per_ghs",
  "backup_frequency",
  "public_home_url",
  "default_interest_rate",
  "min_loan_amount",
  "max_loan_amount",
  "late_payment_fee",
  "sms_enabled",
  "email_enabled",
  "notification_retention_days",
  "auto_notify_payment_due",
  "maintenance_mode",
  "maintenance_message",
  "log_retention_days",
  "auto_cleanup_enabled",
  "debug_mode",
  "max_login_attempts",
  "password_min_length",
  "require_2fa",
  "lockout_duration",
  "session_timeout",
] as const;

/** Plain object only — unstable_cache serializes cache entries; Map becomes a broken {}. */
async function fetchSystemSettingsRecord(keys: string[]): Promise<Record<string, string>> {
  const { prisma } = await import("@/lib/db");
  const rows = await prisma.systemSetting.findMany({
    where: { settingKey: { in: keys } },
    select: { settingKey: true, settingValue: true },
  });
  const out: Record<string, string> = {};
  for (const r of rows) out[r.settingKey] = r.settingValue;
  return out;
}

/**
 * Returns system settings from DB. Cached for 60s; revalidate with tag "system-settings".
 * Pass specific keys to return only those (still loads all from cache, filters in memory).
 */
export async function getSystemSettings(
  keys?: readonly string[] | string[]
): Promise<Map<string, string>> {
  const record = await unstable_cache(
    () => fetchSystemSettingsRecord([...SYSTEM_SETTING_KEYS]),
    ["system-settings-full"],
    { revalidate: 60, tags: ["system-settings"] }
  )();
  const full = new Map<string, string>(Object.entries(record ?? {}));
  if (!keys || keys.length === 0) return full;
  const filtered = new Map<string, string>();
  for (const k of keys) {
    const v = full.get(k);
    if (v !== undefined) filtered.set(k, v);
  }
  return filtered;
}

function parseBool(val: string | undefined): boolean {
  if (val === undefined || val === "") return false;
  const v = val.trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes";
}

function parseNum(val: string | undefined, fallback: number): number {
  if (val === undefined || val === "") return fallback;
  const n = parseInt(val.trim(), 10);
  return Number.isNaN(n) ? fallback : n;
}

export async function getCurrency(): Promise<string> {
  const d = await getCurrencyDisplay();
  return d.code;
}

/** Stored amounts are GHS; display may convert using admin-set rate. */
export type CurrencyDisplay = { code: string; rateFromGhs: number };

function parseDisplayRate(raw: string | undefined): number | null {
  const r = parseFloat((raw ?? "").trim());
  if (!Number.isFinite(r) || r <= 0 || r === 1) return null;
  return r;
}

/** USD/EUR-specific rate, else legacy single rate, else 1 (no conversion). */
function resolveRateForCode(
  code: "USD" | "EUR",
  map: Map<string, string>
): number {
  const specific =
    code === "USD"
      ? parseDisplayRate(map.get("currency_rate_usd_per_ghs"))
      : parseDisplayRate(map.get("currency_rate_eur_per_ghs"));
  if (specific != null) return specific;
  const legacy = parseDisplayRate(map.get("currency_rate_from_ghs"));
  if (legacy != null) return legacy;
  return 1;
}

export async function getCurrencyDisplay(): Promise<CurrencyDisplay> {
  const map = await getSystemSettings([
    "currency",
    "currency_rate_from_ghs",
    "currency_rate_usd_per_ghs",
    "currency_rate_eur_per_ghs",
  ]);
  const code = (map.get("currency")?.trim() || "GHS").toUpperCase();
  if (code === "GHS") return { code: "GHS", rateFromGhs: 1 };
  if (code === "USD") return { code: "USD", rateFromGhs: resolveRateForCode("USD", map) };
  if (code === "EUR") return { code: "EUR", rateFromGhs: resolveRateForCode("EUR", map) };
  return { code, rateFromGhs: 1 };
}

export async function getSecuritySettings(): Promise<{
  maxLoginAttempts: number;
  lockoutDurationMinutes: number;
  passwordMinLength: number;
  require2fa: boolean;
  sessionTimeoutMinutes: number;
}> {
  const map = await getSystemSettings([
    "max_login_attempts",
    "lockout_duration",
    "password_min_length",
    "require_2fa",
    "session_timeout",
  ]);
  return {
    maxLoginAttempts: parseNum(map.get("max_login_attempts"), 5),
    lockoutDurationMinutes: parseNum(map.get("lockout_duration"), 30),
    passwordMinLength: parseNum(map.get("password_min_length"), 8),
    require2fa: parseBool(map.get("require_2fa")),
    sessionTimeoutMinutes: parseNum(map.get("session_timeout"), 0),
  };
}

export async function getLoanDefaults(): Promise<{
  defaultInterestRate: number;
  minLoanAmount: number;
  maxLoanAmount: number;
  latePaymentFee: number;
}> {
  const map = await getSystemSettings([
    "default_interest_rate",
    "min_loan_amount",
    "max_loan_amount",
    "late_payment_fee",
  ]);
  return {
    defaultInterestRate: parseFloat(map.get("default_interest_rate") ?? "0.5") || 0.5,
    minLoanAmount: parseFloat(map.get("min_loan_amount") ?? "5") || 5,
    maxLoanAmount: parseFloat(map.get("max_loan_amount") ?? "8") || 8,
    latePaymentFee: parseFloat(map.get("late_payment_fee") ?? "1") || 1,
  };
}

export async function isSmsEnabled(): Promise<boolean> {
  const map = await getSystemSettings(["sms_enabled"]);
  return parseBool(map.get("sms_enabled"));
}

export async function isEmailEnabled(): Promise<boolean> {
  const map = await getSystemSettings(["email_enabled"]);
  return parseBool(map.get("email_enabled"));
}

export async function getMaintenanceStatus(): Promise<{ maintenanceMode: boolean; message: string }> {
  const map = await getSystemSettings(["maintenance_mode", "maintenance_message"]);
  return {
    maintenanceMode: parseBool(map.get("maintenance_mode")),
    message: map.get("maintenance_message")?.trim() || "We are currently under maintenance. Please try again later.",
  };
}
