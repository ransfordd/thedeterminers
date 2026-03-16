"use client";

import { useActionState } from "react";
import { changePassword, type ChangePasswordState } from "@/app/actions/account";

const initialState: ChangePasswordState = {};

export function ChangePasswordForm() {
  const [state, formAction] = useActionState(changePassword, initialState);

  return (
    <form action={formAction} className="space-y-4 max-w-xl">
      {state?.error && (
        <div className="rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 text-sm">
          {state.error}
        </div>
      )}
      {state?.success && (
        <div className="rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300 px-4 py-3 text-sm">
          Password changed successfully.
        </div>
      )}
      <div>
        <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Current password
        </label>
        <input
          id="currentPassword"
          name="currentPassword"
          type="password"
          required
          autoComplete="current-password"
          className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2"
        />
      </div>
      <div>
        <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          New password
        </label>
        <input
          id="newPassword"
          name="newPassword"
          type="password"
          required
          minLength={6}
          autoComplete="new-password"
          className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2"
        />
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">At least 6 characters</p>
      </div>
      <div>
        <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Confirm new password
        </label>
        <input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          required
          minLength={6}
          autoComplete="new-password"
          className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2"
        />
      </div>
      <button
        type="submit"
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white font-medium text-sm hover:bg-indigo-700"
      >
        <i className="fas fa-key" /> Change password
      </button>
    </form>
  );
}
