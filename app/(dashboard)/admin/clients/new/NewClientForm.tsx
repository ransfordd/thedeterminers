"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { createClient, type CreateClientState } from "@/app/actions/clients";

const initialState: CreateClientState = {};

type AgentOption = { id: number; agentCode: string; firstName: string; lastName: string };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="px-4 py-2 rounded-lg bg-primary-600 hover:bg-primary-700 text-white font-medium bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed"
    >
      {pending ? "Creating..." : "Create Client"}
    </button>
  );
}

export function NewClientForm({ agents }: { agents: AgentOption[] }) {
  const [state, formAction] = useActionState(createClient, initialState);

  return (
    <form action={formAction} className="space-y-6 max-w-2xl" autoComplete="off">
      {state?.error && (
        <div className="rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 text-sm">
          {state.error}
        </div>
      )}
      {state?.success && (
        <div className="rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300 px-4 py-3 text-sm">
          Client created successfully. <a href="/admin/clients" className="font-medium underline">Back to clients</a>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="username" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Username <span className="text-red-500">*</span>
          </label>
          <input
            id="username"
            name="username"
            type="text"
            required
            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2"
          />
        </div>
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Email <span className="text-red-500">*</span>
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="off"
            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2"
          />
        </div>
      </div>

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
            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="phone" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Phone
          </label>
          <input
            id="phone"
            name="phone"
            type="tel"
            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2"
          />
        </div>
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Password <span className="text-red-500">*</span>
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            autoComplete="new-password"
            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2"
          />
        </div>
      </div>

      <div>
        <label htmlFor="agentId" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Assigned Agent <span className="text-red-500">*</span>
        </label>
        <select
          id="agentId"
          name="agentId"
          required
          className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2"
        >
          <option value="">Select an Agent</option>
          {agents.map((a) => (
            <option key={a.id} value={a.id}>
              {a.agentCode} – {a.firstName} {a.lastName}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Deposit Type <span className="text-red-500">*</span>
          </label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="radio" name="depositType" value="fixed_amount" defaultChecked className="rounded" />
              <span className="text-sm">Fixed daily amount</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="radio" name="depositType" value="flexible_amount" className="rounded" />
              <span className="text-sm">Flexible daily amount</span>
            </label>
          </div>
        </div>
        <div>
          <label htmlFor="dailyDepositAmount" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Daily Deposit Amount (GHS) <span className="text-red-500">*</span>
          </label>
          <input
            id="dailyDepositAmount"
            name="dailyDepositAmount"
            type="number"
            step="0.01"
            min="0"
            defaultValue="20"
            required
            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2"
          />
        </div>
      </div>

      <div>
        <label htmlFor="preferredCollectionTime" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Preferred Collection Time
        </label>
        <input
          id="preferredCollectionTime"
          name="preferredCollectionTime"
          type="text"
          placeholder="e.g. 09:00"
          className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2"
        />
      </div>

      <div className="flex gap-3 pt-2">
        <a
          href="/admin/clients"
          className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
        >
          Cancel
        </a>
        <SubmitButton />
      </div>
    </form>
  );
}
