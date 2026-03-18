"use client";

import { useActionState } from "react";
import { updateSetting, type UpdateSettingState } from "@/app/actions/settings";

const initialState: UpdateSettingState = {};

type SettingRow = {
  id: number;
  settingKey: string;
  settingValue: string;
  settingType: string;
  category: string | null;
  description: string | null;
};

const CATEGORY_LABELS: Record<string, string> = {
  system: "System Configuration",
  security: "Security Settings",
  business: "Business Settings",
  susu: "Susu Settings",
  loans: "Loan Settings",
  notifications: "Notification Settings",
  maintenance: "System Maintenance",
};

const CATEGORY_ICONS: Record<string, string> = {
  system: "fa-cogs",
  security: "fa-shield-alt",
  business: "fa-building",
  susu: "fa-piggy-bank",
  loans: "fa-hand-holding-usd",
  notifications: "fa-bell",
  maintenance: "fa-tools",
};

/** Legacy single-rate row hidden from UI (fallback read only). */
const HIDDEN_SYSTEM_SETTING_KEYS = new Set(["currency_rate_from_ghs"]);

/** Display order within System Configuration: currency, then USD rate, then EUR rate, then rest A–Z. */
const SYSTEM_SETTING_ORDER = ["currency", "currency_rate_usd_per_ghs", "currency_rate_eur_per_ghs"];

/** Extra help under the label for specific keys (DB description stays as title). */
const SETTING_VALUE_HELP: Record<string, string> = {
  currency_rate_usd_per_ghs:
    "How many US dollars equal one Ghana Cedi for display only. Example: 0.0916 → 900 GHS shows as ~USD 82.44. Save before switching Currency to USD.",
  currency_rate_eur_per_ghs:
    "How many euros equal one Ghana Cedi for display only. Example: 0.055 → 900 GHS shows as ~EUR 49.50. Save before switching Currency to EUR.",
};

const HIDDEN_SUSU_SETTING_KEYS = new Set([
  "default_susu_cycle_days",
  "susu_days",
  "susu_payout_days",
  "susu_cycle_days",
  "payout_days",
]);

const SELECT_OPTIONS: Record<string, { value: string; label: string }[]> = {
  currency: [
    { value: "GHS", label: "GHS (Ghana Cedi)" },
    { value: "USD", label: "USD (US Dollar)" },
    { value: "EUR", label: "EUR (Euro)" },
  ],
  backup_frequency: [
    { value: "Daily", label: "Daily" },
    { value: "Weekly", label: "Weekly" },
    { value: "Monthly", label: "Monthly" },
  ],
  require_2fa: [
    { value: "0", label: "Disabled" },
    { value: "1", label: "Enabled" },
  ],
  maintenance_mode: [
    { value: "0", label: "Disabled" },
    { value: "1", label: "Enabled" },
  ],
  auto_cleanup_enabled: [
    { value: "0", label: "Disabled" },
    { value: "1", label: "Enabled" },
  ],
  debug_mode: [
    { value: "0", label: "Disabled" },
    { value: "1", label: "Enabled" },
  ],
  auto_notify_payment_due: [
    { value: "0", label: "Disabled" },
    { value: "1", label: "1 Day Before" },
    { value: "3", label: "3 Days Before" },
    { value: "7", label: "7 Days Before" },
  ],
};

function SettingRowForm({ setting }: { setting: SettingRow }) {
  const [state, formAction] = useActionState(updateSetting, initialState);
  const isBoolean = setting.settingType === "boolean";
  const isNumber = setting.settingType === "number";
  const options = SELECT_OPTIONS[setting.settingKey];

  return (
    <tr className="border-b border-gray-100 dark:border-gray-800">
      <td className="py-2 pr-4">
        <label htmlFor={`setting-${setting.settingKey}`} className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {setting.description || setting.settingKey}
        </label>
        {SETTING_VALUE_HELP[setting.settingKey] && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-xl">
            {SETTING_VALUE_HELP[setting.settingKey]}
          </p>
        )}
      </td>
      <td className="py-2 pr-4">
        <form action={formAction} className="flex gap-2 items-center flex-wrap">
          <input type="hidden" name="settingKey" value={setting.settingKey} />
          {options ? (
            <select
              id={`setting-${setting.settingKey}`}
              name="settingValue"
              defaultValue={setting.settingValue}
              className="rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-2 py-1.5 text-sm min-w-[140px]"
            >
              {options.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          ) : isBoolean ? (
            <select
              id={`setting-${setting.settingKey}`}
              name="settingValue"
              defaultValue={setting.settingValue}
              className="rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-2 py-1.5 text-sm"
            >
              <option value="0">No</option>
              <option value="1">Yes</option>
            </select>
          ) : (
            <input
              id={`setting-${setting.settingKey}`}
              name="settingValue"
              type={isNumber ? "number" : "text"}
              step={isNumber ? "any" : undefined}
              defaultValue={setting.settingValue}
              className="flex-1 min-w-[120px] rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-2 py-1.5 text-sm"
            />
          )}
          <button
            type="submit"
            className="rounded px-3 py-1.5 text-xs font-medium bg-indigo-600 text-white hover:bg-indigo-700"
          >
            Save
          </button>
        </form>
        {state?.success && <span className="text-xs text-green-600 dark:text-green-400 ml-1">Saved</span>}
        {state?.error && <span className="text-xs text-red-600 dark:text-red-400 ml-1">{state.error}</span>}
      </td>
    </tr>
  );
}

export function SettingsByCategory({ settings }: { settings: SettingRow[] }) {
  const byCategory = settings.reduce<Record<string, SettingRow[]>>((acc, s) => {
    const cat = s.category || "other";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(s);
    return acc;
  }, {});

  const order = ["system", "security", "business", "susu", "loans", "notifications", "maintenance", "other"];

  return (
    <div className="space-y-6">
      {order.map((cat) => {
        if (cat === "susu") {
          const raw = byCategory[cat] ?? [];
          const visible = raw.filter((s) => !HIDDEN_SUSU_SETTING_KEYS.has(s.settingKey));
          const label = CATEGORY_LABELS.susu;
          const icon = CATEGORY_ICONS.susu;
          return (
            <div
              key="susu"
              className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-hidden"
            >
              <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <i className={`fas ${icon} text-indigo-600 dark:text-indigo-400`} aria-hidden />
                  {label}
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">How Susu cycles work in this system</p>
              </div>
              <div className="px-4 py-3 border-b border-indigo-100 dark:border-indigo-900/40 bg-indigo-50/80 dark:bg-indigo-950/30 text-sm text-gray-700 dark:text-gray-300">
                <p className="font-medium text-gray-900 dark:text-white mb-1">Calendar-month cycles</p>
                <p>
                  Each Susu cycle runs from the <strong>1st</strong> through the <strong>last day</strong> of the
                  calendar month. The number of collection days (28, 29, 30, or 31) is set automatically—including
                  February in leap years. You do not configure a fixed &quot;cycle length&quot; here; changing old
                  &quot;cycle days&quot; settings would not affect how cycles are created.
                </p>
              </div>
              {visible.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <tbody>
                      {visible.map((s) => (
                        <SettingRowForm key={s.settingKey} setting={s} />
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="px-4 py-4 text-sm text-gray-500 dark:text-gray-400">
                  No extra Susu options in settings. All active clients get one cycle per calendar month.
                </p>
              )}
            </div>
          );
        }

        const raw = byCategory[cat];
        if (!raw?.length) return null;
        const items =
          cat === "system"
            ? [...raw]
                .filter((s) => !HIDDEN_SYSTEM_SETTING_KEYS.has(s.settingKey))
                .sort((a, b) => {
                  const ra = SYSTEM_SETTING_ORDER.indexOf(a.settingKey);
                  const rb = SYSTEM_SETTING_ORDER.indexOf(b.settingKey);
                  const ca = ra === -1 ? 1000 : ra;
                  const cb = rb === -1 ? 1000 : rb;
                  return ca - cb || a.settingKey.localeCompare(b.settingKey);
                })
            : raw;
        const label = CATEGORY_LABELS[cat] || cat.charAt(0).toUpperCase() + cat.slice(1);
        const icon = CATEGORY_ICONS[cat] || "fa-cog";
        return (
          <div
            key={cat}
            className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-hidden"
          >
            <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <i className={`fas ${icon} text-indigo-600 dark:text-indigo-400`} aria-hidden />
                {label}
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Configure parameters for this section</p>
            </div>
            {cat === "system" && (
              <div className="px-4 py-3 border-b border-amber-100 dark:border-amber-900/30 bg-amber-50/80 dark:bg-amber-950/20 text-sm text-gray-700 dark:text-gray-300">
                <p className="font-medium text-gray-900 dark:text-white mb-1">Currency and display rates</p>
                <p>
                  All amounts are <strong>stored in GHS</strong>. Set <strong>USD per 1 GHS</strong> and{" "}
                  <strong>EUR per 1 GHS</strong> below (each on its own row—Save each), then use the Currency dropdown
                  for the label you want. Example: 900 GHS at{" "}
                  <code className="text-xs bg-white/50 dark:bg-gray-800 px-1 rounded">0.0916</code> USD/GHS → ~USD 82.44.
                </p>
              </div>
            )}
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <tbody>
                  {items.map((s) => (
                    <SettingRowForm key={s.settingKey} setting={s} />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
    </div>
  );
}
