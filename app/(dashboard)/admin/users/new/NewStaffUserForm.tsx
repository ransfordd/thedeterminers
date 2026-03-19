"use client";

import { useActionState, useMemo, useState } from "react";
import { createStaffUser, type CreateStaffUserState } from "@/app/actions/users";

const initialState: CreateStaffUserState = {};

export function NewStaffUserForm() {
  const [state, formAction] = useActionState(createStaffUser, initialState);
  const isSuccess = useMemo(() => Boolean(state?.success), [state?.success]);
  const [selectedRole, setSelectedRole] = useState<"agent" | "manager" | "business_admin">("agent");

  return (
    <form action={formAction} className="max-w-2xl space-y-6" autoComplete="off">
      {state?.error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-300">
          {state.error}
        </div>
      )}
      {isSuccess && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700 dark:border-green-800 dark:bg-green-950/30 dark:text-green-300">
          User created successfully. <a href="/admin/users" className="font-medium underline">Back to users</a>
        </div>
      )}

      <div>
        <label htmlFor="role" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
          Role <span className="text-red-500">*</span>
        </label>
        <select
          id="role"
          name="role"
          value={selectedRole}
          onChange={(e) => setSelectedRole(e.target.value as "agent" | "manager" | "business_admin")}
          required
          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
        >
          <option value="agent">Agent</option>
          <option value="manager">Manager</option>
          <option value="business_admin">Admin</option>
        </select>
      </div>

      {selectedRole === "business_admin" && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
          <label className="flex cursor-pointer items-start gap-2">
            <input id="adminConfirm" name="adminConfirm" type="checkbox" className="mt-0.5 rounded" />
            <span>
              I understand that creating an <strong>Admin</strong> account grants full system access.
              (Required when Role is Admin.)
            </span>
          </label>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label htmlFor="firstName" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
            First Name <span className="text-red-500">*</span>
          </label>
          <input
            id="firstName"
            name="firstName"
            type="text"
            required
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
          />
        </div>
        <div>
          <label htmlFor="lastName" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Last Name <span className="text-red-500">*</span>
          </label>
          <input
            id="lastName"
            name="lastName"
            type="text"
            required
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label htmlFor="username" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Username <span className="text-red-500">*</span>
          </label>
          <input
            id="username"
            name="username"
            type="text"
            required
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
          />
        </div>
        <div>
          <label htmlFor="email" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Email <span className="text-red-500">*</span>
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="off"
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label htmlFor="phone" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Phone
          </label>
          <input
            id="phone"
            name="phone"
            type="tel"
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
          />
        </div>
        <div>
          <label htmlFor="commissionRate" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Agent Commission Rate (%)
          </label>
          <input
            id="commissionRate"
            name="commissionRate"
            type="number"
            step="0.1"
            min="0"
            max="100"
            defaultValue="5"
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
          />
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Used only when role is Agent.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label htmlFor="password" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Password <span className="text-red-500">*</span>
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            minLength={6}
            autoComplete="new-password"
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
          />
        </div>
        <div>
          <label htmlFor="passwordConfirm" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Confirm Password <span className="text-red-500">*</span>
          </label>
          <input
            id="passwordConfirm"
            name="passwordConfirm"
            type="password"
            required
            minLength={6}
            autoComplete="new-password"
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
          />
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <a
          href="/admin/users"
          className="rounded-lg border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
        >
          Cancel
        </a>
        <button
          type="submit"
          className="rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white hover:bg-indigo-700"
        >
          Create User
        </button>
      </div>
    </form>
  );
}
