"use client";

import { useActionState } from "react";
import { updateClient, type UpdateClientState } from "@/app/actions/clients";

const initialState: UpdateClientState = {};

type AgentOption = { id: number; agentCode: string; firstName: string; lastName: string };

type Props = {
  clientId: number;
  defaultValue: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    agentId: number;
    dailyDepositAmount: number;
    depositType: string;
    preferredCollectionTime: string;
  };
  agents: AgentOption[];
  returnTo: string;
};

export function EditClientForm({ clientId, defaultValue, agents, returnTo }: Props) {
  const [state, formAction] = useActionState(updateClient, initialState);

  return (
    <form action={formAction} className="space-y-6 max-w-2xl">
      <input type="hidden" name="clientId" value={clientId} />
      {state?.error && (
        <div className="rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 text-sm">
          {state.error}
        </div>
      )}
      {state?.success && (
        <div className="rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300 px-4 py-3 text-sm">
          Client updated. <a href={returnTo} className="font-medium underline">Back to list</a>
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
        <label htmlFor="agentId" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Assigned Agent <span className="text-red-500">*</span>
        </label>
        <select
          id="agentId"
          name="agentId"
          required
          defaultValue={defaultValue.agentId}
          className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2"
        >
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
              <input
                type="radio"
                name="depositType"
                value="fixed_amount"
                defaultChecked={defaultValue.depositType === "fixed_amount"}
                className="rounded"
              />
              <span className="text-sm">Fixed daily amount</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="depositType"
                value="flexible_amount"
                defaultChecked={defaultValue.depositType === "flexible_amount"}
                className="rounded"
              />
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
            required
            defaultValue={defaultValue.dailyDepositAmount}
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
          defaultValue={defaultValue.preferredCollectionTime}
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
          Update Client
        </button>
      </div>
    </form>
  );
}
