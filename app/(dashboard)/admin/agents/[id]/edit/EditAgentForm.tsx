"use client";

import { useActionState } from "react";
import { updateAgent, type UpdateAgentState } from "@/app/actions/agents";

const initialState: UpdateAgentState = {};

type Props = {
  agentId: number;
  defaultValue: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    commissionRate: number;
  };
  returnTo: string;
};

export function EditAgentForm({ agentId, defaultValue, returnTo }: Props) {
  const [state, formAction] = useActionState(updateAgent, initialState);

  return (
    <form action={formAction} className="space-y-6 max-w-2xl">
      <input type="hidden" name="agentId" value={agentId} />
      {state?.error && (
        <div className="rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 text-sm">
          {state.error}
        </div>
      )}
      {state?.success && (
        <div className="rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300 px-4 py-3 text-sm">
          Agent updated. <a href={returnTo} className="font-medium underline">Back to list</a>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            First Name <span className="text-red-500">*</span>
          </label>
          <input
            id="firstName"
            name="firstName"
            type="text"
            required
            defaultValue={defaultValue.firstName}
            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2"
          />
        </div>
        <div>
          <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Last Name <span className="text-red-500">*</span>
          </label>
          <input
            id="lastName"
            name="lastName"
            type="text"
            required
            defaultValue={defaultValue.lastName}
            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Email <span className="text-red-500">*</span>
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            defaultValue={defaultValue.email}
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
            defaultValue={defaultValue.phone}
            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2"
          />
        </div>
      </div>

      <div>
        <label htmlFor="commissionRate" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Commission Rate (%) <span className="text-red-500">*</span>
        </label>
        <input
          id="commissionRate"
          name="commissionRate"
          type="number"
          step="0.1"
          min="0"
          max="100"
          required
          defaultValue={defaultValue.commissionRate}
          className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2"
        />
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          New Password (leave blank to keep current)
        </label>
        <input
          id="password"
          name="password"
          type="password"
          minLength={6}
          placeholder="Optional"
          className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2"
        />
      </div>

      <div className="flex gap-3 pt-2">
        <a
          href={returnTo}
          className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
        >
          Cancel
        </a>
        <button
          type="submit"
          className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium"
        >
          Update Agent
        </button>
      </div>
    </form>
  );
}
