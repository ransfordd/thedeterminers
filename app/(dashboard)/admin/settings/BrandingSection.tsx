"use client";

import { useActionState } from "react";
import { updateBranding, type UpdateBrandingState } from "@/app/actions/settings";

const initialState: UpdateBrandingState = {};

export function BrandingSection({
  appName,
  appLogoPath,
}: {
  appName: string;
  appLogoPath: string | null;
}) {
  const [state, formAction] = useActionState(updateBranding, initialState);

  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4 mb-6">
      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
        <i className="fas fa-palette" />
        Branding
      </h3>
      <form action={formAction} className="space-y-4">
        {state?.error && (
          <p className="text-sm text-red-600 dark:text-red-400">{state.error}</p>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="app_name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Application name
            </label>
            <input
              id="app_name"
              name="app_name"
              type="text"
              defaultValue={appName}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2"
            />
          </div>
          <div>
            <label htmlFor="app_logo" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Application logo
            </label>
            {appLogoPath ? (
              <div className="mb-2">
                <img
                  src={appLogoPath}
                  alt="Current logo"
                  className="max-w-[150px] max-h-[60px] object-contain border border-gray-200 dark:border-gray-600 rounded"
                />
              </div>
            ) : (
              <div className="mb-2 w-[150px] h-[60px] border-2 border-dashed border-gray-300 dark:border-gray-600 rounded flex items-center justify-center text-gray-500 text-sm">
                <i className="fas fa-image" /> No logo
              </div>
            )}
            <input
              id="app_logo"
              name="app_logo"
              type="file"
              accept="image/*"
              className="w-full text-sm text-gray-600 dark:text-gray-400 file:mr-2 file:rounded file:border-0 file:bg-indigo-50 file:px-3 file:py-1.5 file:text-indigo-700 dark:file:bg-indigo-900/30 dark:file:text-indigo-300"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              JPG, PNG, GIF, SVG. Max 2MB. Leave empty to keep current logo.
            </p>
          </div>
        </div>
        <button
          type="submit"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700"
        >
          <i className="fas fa-save" /> Update branding
        </button>
      </form>
    </div>
  );
}
