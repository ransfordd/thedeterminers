"use client";

import { useActionState } from "react";
import { updateSetting, type UpdateSettingState } from "@/app/actions/settings";

const initialState: UpdateSettingState = {};

type SettingRow = { id: number; settingKey: string; settingValue: string; settingType: string; category: string | null; description: string | null };

export function SettingsTable({ settings }: { settings: SettingRow[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm text-left">
        <thead>
          <tr className="border-b border-gray-200 dark:border-gray-700">
            <th className="py-2 pr-4">Key</th>
            <th className="py-2 pr-4">Value</th>
            <th className="py-2 pr-4">Type</th>
            <th className="py-2 pr-4">Category</th>
            <th className="py-2">Action</th>
          </tr>
        </thead>
        <tbody>
          {settings.map((s) => (
            <SettingRowForm key={s.settingKey} setting={s} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SettingRowForm({ setting }: { setting: SettingRow }) {
  const [state, formAction] = useActionState(updateSetting, initialState);

  return (
    <tr className="border-b border-gray-100 dark:border-gray-800">
      <td className="py-2 pr-4">
        <code className="text-xs bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">{setting.settingKey}</code>
      </td>
      <td className="py-2 pr-4">
        <form action={formAction} className="flex gap-2 items-center">
          <input type="hidden" name="settingKey" value={setting.settingKey} />
          <input
            name="settingValue"
            type="text"
            defaultValue={setting.settingValue}
            className="flex-1 min-w-[120px] rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-2 py-1 text-sm"
          />
          <button type="submit" className="rounded px-2 py-1 text-xs font-medium bg-blue-600 text-white hover:bg-blue-700">
            Save
          </button>
        </form>
        {state?.success && <span className="text-xs text-green-600 dark:text-green-400 ml-1">Saved</span>}
        {state?.error && <span className="text-xs text-red-600 dark:text-red-400 ml-1">{state.error}</span>}
      </td>
      <td className="py-2 pr-4 text-gray-600 dark:text-gray-400">{setting.settingType}</td>
      <td className="py-2 pr-4 text-gray-600 dark:text-gray-400">{setting.category ?? "—"}</td>
      <td className="py-2">—</td>
    </tr>
  );
}
