"use client";

import { useActionState } from "react";
import { updateProfile, type AccountProfileState } from "@/app/actions/account";

const initialState: AccountProfileState = {};

export function AccountSettingsForm({
  user,
}: {
  user: { firstName: string; lastName: string; email: string; phone: string; address: string | null };
}) {
  const [state, formAction] = useActionState(updateProfile, initialState);

  return (
    <form action={formAction} className="space-y-4 max-w-xl">
      {state?.error && (
        <div className="rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 text-sm">
          {state.error}
        </div>
      )}
      {state?.success && (
        <div className="rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300 px-4 py-3 text-sm">
          Profile updated successfully.
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            First name
          </label>
          <input
            id="firstName"
            name="firstName"
            type="text"
            required
            defaultValue={user.firstName}
            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2"
          />
        </div>
        <div>
          <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Last name
          </label>
          <input
            id="lastName"
            name="lastName"
            type="text"
            required
            defaultValue={user.lastName}
            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2"
          />
        </div>
      </div>
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          defaultValue={user.email}
          className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2"
        />
      </div>
      <div>
        <label htmlFor="phone" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Phone
        </label>
        <input
          id="phone"
          name="phone"
          type="tel"
          defaultValue={user.phone}
          className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2"
        />
      </div>
      <div>
        <label htmlFor="address" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Address
        </label>
        <textarea
          id="address"
          name="address"
          rows={3}
          defaultValue={user.address ?? ""}
          className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2"
        />
      </div>
      <button
        type="submit"
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white font-medium text-sm hover:bg-indigo-700"
      >
        <i className="fas fa-save" /> Save profile
      </button>
    </form>
  );
}
