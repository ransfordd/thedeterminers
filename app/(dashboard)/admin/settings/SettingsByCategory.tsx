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
        const items = byCategory[cat];
        if (!items?.length) return null;
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
