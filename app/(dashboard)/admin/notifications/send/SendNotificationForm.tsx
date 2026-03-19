"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { sendNotification, type SendNotificationState } from "@/app/actions/notifications";

const initialState: SendNotificationState = {};

type UserOption = { id: number; name: string; email: string; role: string };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white font-medium text-sm hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed"
    >
      <i className="fas fa-paper-plane" /> {pending ? "Sending..." : "Send notification"}
    </button>
  );
}

export function SendNotificationForm({ users }: { users: UserOption[] }) {
  const [state, formAction] = useActionState(sendNotification, initialState);

  return (
    <form action={formAction} className="space-y-4 max-w-xl">
      {state?.error && (
        <div className="rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 text-sm">
          {state.error}
        </div>
      )}
      {state?.success && (
        <div className="rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300 px-4 py-3 text-sm">
          Notification sent.
        </div>
      )}
      <div>
        <label htmlFor="userId" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Recipient <span className="text-red-500">*</span>
        </label>
        <select
          id="userId"
          name="userId"
          required
          className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2"
        >
          <option value="">Select user...</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name} ({u.email}) – {u.role}
            </option>
          ))}
        </select>
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
      <SubmitButton />
    </form>
  );
}
