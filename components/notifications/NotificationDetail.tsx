import Link from "next/link";
import type { NotificationDetail } from "@/lib/notifications-access";

export function NotificationDetailView({
  notification,
  backHref,
}: {
  notification: NotificationDetail;
  backHref: string;
}) {
  const typeLabel = notification.notificationType.replace(/_/g, " ");

  return (
    <div className="max-w-2xl space-y-6">
      <Link
        href={backHref}
        className="inline-flex items-center gap-2 text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
      >
        <i className="fas fa-arrow-left" aria-hidden />
        Back to notifications
      </Link>

      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6 shadow-sm space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white pr-4">{notification.title}</h1>
          <span className="shrink-0 px-2.5 py-1 rounded-md text-xs font-medium capitalize bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200">
            {typeLabel}
          </span>
        </div>

        <p className="text-sm text-gray-500 dark:text-gray-400">
          {new Date(notification.createdAt).toLocaleString("en-GB")}
          {notification.readAt ? (
            <span className="ml-2">
              · Read {new Date(notification.readAt).toLocaleString("en-GB")}
            </span>
          ) : null}
        </p>

        <div className="border-t border-gray-100 dark:border-gray-800 pt-4">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Message</p>
          <div className="text-gray-900 dark:text-gray-100 whitespace-pre-wrap break-words text-base leading-relaxed">
            {notification.message}
          </div>
        </div>

        <p className="text-xs text-gray-500 dark:text-gray-400">
          Status: {notification.isRead ? "Read" : "Unread"}
        </p>
      </div>
    </div>
  );
}
