"use client";

import { useActionState } from "react";
import { sendNotification, type SendNotificationState } from "@/app/actions/settings";

const initialState: SendNotificationState = {};

export function SendNotificationForm() {
  const [state, formAction] = useActionState(sendNotification, initialState);

  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4">
      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
        <i className="fas fa-bell" />
        Send Notification
      </h3>
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
        Broadcast messages to users.
      </p>
      <form action={formAction} className="space-y-3">
        {state?.error && (
          <p className="text-sm text-red-600 dark:text-red-400">{state.error}</p>
        )}
        <div>
          <label htmlFor="notif_title" className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
            Title
          </label>
          <input
            id="notif_title"
            name="title"
            type="text"
            required
            className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-2 py-1.5 text-sm"
          />
        </div>
        <div>
          <label htmlFor="notif_message" className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
            Message
          </label>
          <textarea
            id="notif_message"
            name="message"
            rows={3}
            required
            className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-2 py-1.5 text-sm"
          />
        </div>
        <div>
          <label htmlFor="notif_type" className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
            Type
          </label>
          <select
            id="notif_type"
            name="type"
            className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-2 py-1.5 text-sm"
          >
            <option value="info">Info</option>
            <option value="warning">Warning</option>
            <option value="success">Success</option>
            <option value="error">Error</option>
          </select>
        </div>
        <div>
          <label htmlFor="notif_target" className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
            Target
          </label>
          <select
            id="notif_target"
            name="target_role"
            className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-2 py-1.5 text-sm"
          >
            <option value="all">All users</option>
            <option value="agent">Agents only</option>
            <option value="client">Clients only</option>
            <option value="manager">Managers only</option>
          </select>
        </div>
        <button
          type="submit"
          className="w-full px-3 py-2 rounded bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700"
        >
          Send notification
        </button>
      </form>
    </div>
  );
}
