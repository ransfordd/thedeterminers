"use client";

import { useActionState, useState, type FormEvent } from "react";
import { useFormStatus } from "react-dom";
import { sendNotification, type SendNotificationState } from "@/app/actions/notifications";

const initialState: SendNotificationState = {};

type UserOption = { id: number; name: string; email: string; role: string };

export type RecipientCounts = {
  allUsers: number;
  agents: number;
  clients: number;
};

type Scope = "single" | "all_active_users" | "all_agents" | "all_clients";

function SubmitButton({ scope }: { scope: Scope }) {
  const { pending } = useFormStatus();
  const isBulk = scope !== "single";
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white font-medium text-sm hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed"
    >
      <i className="fas fa-paper-plane" />{" "}
      {pending ? "Sending..." : isBulk ? "Send to all selected" : "Send notification"}
    </button>
  );
}

export function SendNotificationForm({
  users,
  counts,
}: {
  users: UserOption[];
  counts: RecipientCounts;
}) {
  const [scope, setScope] = useState<Scope>("single");
  const [state, formAction] = useActionState(sendNotification, initialState);

  function confirmBulkSubmit(e: FormEvent<HTMLFormElement>) {
    if (scope === "single") return;
    const n =
      scope === "all_active_users"
        ? counts.allUsers
        : scope === "all_agents"
          ? counts.agents
          : counts.clients;
    if (!confirm(`Send this notification to ${n.toLocaleString()} user(s)?`)) {
      e.preventDefault();
    }
  }

  return (
    <form action={formAction} onSubmit={confirmBulkSubmit} className="space-y-4 max-w-xl">
      {state?.error && (
        <div className="rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 text-sm">
          {state.error}
        </div>
      )}
      {state?.success && (
        <div className="rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300 px-4 py-3 text-sm">
          {state.sentCount != null && state.sentCount > 0 ? (
            <>
              Notification sent to <strong>{state.sentCount}</strong>{" "}
              {state.sentCount === 1 ? "user" : "users"}.
            </>
          ) : (
            <>Notification sent.</>
          )}
        </div>
      )}
      <input type="hidden" name="recipientScope" value={scope} />
      <div>
        <span className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Recipients <span className="text-red-500">*</span>
        </span>
        <div className="space-y-2 rounded-lg border border-gray-200 dark:border-gray-700 p-3 bg-gray-50/50 dark:bg-gray-900/30">
          <label className="flex items-start gap-2 cursor-pointer text-sm text-gray-800 dark:text-gray-200">
            <input
              type="radio"
              className="mt-0.5"
              checked={scope === "single"}
              onChange={() => setScope("single")}
            />
            <span>
              <span className="font-medium">One user</span>
              <span className="block text-xs text-gray-500 dark:text-gray-400">Choose from the list below</span>
            </span>
          </label>
          <label className="flex items-start gap-2 cursor-pointer text-sm text-gray-800 dark:text-gray-200">
            <input
              type="radio"
              className="mt-0.5"
              checked={scope === "all_active_users"}
              onChange={() => setScope("all_active_users")}
            />
            <span>
              <span className="font-medium">All active users</span>
              <span className="block text-xs text-gray-500 dark:text-gray-400">
                Everyone with an active account ({counts.allUsers.toLocaleString()})
              </span>
            </span>
          </label>
          <label className="flex items-start gap-2 cursor-pointer text-sm text-gray-800 dark:text-gray-200">
            <input
              type="radio"
              className="mt-0.5"
              checked={scope === "all_agents"}
              onChange={() => setScope("all_agents")}
            />
            <span>
              <span className="font-medium">All agents</span>
              <span className="block text-xs text-gray-500 dark:text-gray-400">
                Active users with role Agent ({counts.agents.toLocaleString()})
              </span>
            </span>
          </label>
          <label className="flex items-start gap-2 cursor-pointer text-sm text-gray-800 dark:text-gray-200">
            <input
              type="radio"
              className="mt-0.5"
              checked={scope === "all_clients"}
              onChange={() => setScope("all_clients")}
            />
            <span>
              <span className="font-medium">All clients</span>
              <span className="block text-xs text-gray-500 dark:text-gray-400">
                Active users with role Client ({counts.clients.toLocaleString()})
              </span>
            </span>
          </label>
        </div>
      </div>
      <div>
        <label htmlFor="userId" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          User <span className="text-red-500">*</span>
        </label>
        <select
          id="userId"
          name="userId"
          required={scope === "single"}
          disabled={scope !== "single"}
          className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <option value="">Select user...</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name} ({u.email}) – {u.role}
            </option>
          ))}
        </select>
        {scope !== "single" && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Not used for broadcast options.</p>
        )}
      </div>
      <div>
        <label htmlFor="notificationType" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Type
        </label>
        <select
          id="notificationType"
          name="notificationType"
          className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2"
        >
          <option value="system_alert">System alert</option>
          <option value="payment_due">Payment due</option>
          <option value="payment_overdue">Payment overdue</option>
          <option value="payment_recorded">Payment recorded</option>
          <option value="loan_approved">Loan approved</option>
          <option value="loan_rejected">Loan rejected</option>
          <option value="cycle_completed">Cycle completed</option>
        </select>
      </div>
      <div>
        <label htmlFor="title" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Title <span className="text-red-500">*</span>
        </label>
        <input
          id="title"
          name="title"
          type="text"
          required
          className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2"
        />
      </div>
      <div>
        <label htmlFor="message" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Message <span className="text-red-500">*</span>
        </label>
        <textarea
          id="message"
          name="message"
          rows={4}
          required
          className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2"
        />
      </div>
      {scope !== "single" && counts.allUsers > 50 && (
        <p className="text-sm text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg px-3 py-2">
          You are about to notify many users. Confirm the message is appropriate before sending.
        </p>
      )}
      <SubmitButton scope={scope} />
    </form>
  );
}
