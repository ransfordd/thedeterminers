type NotificationRow = {
  id: number;
  title: string;
  message: string;
  notificationType: string;
  createdAt: Date | string;
};

export function RecentNotifications({ notifications }: { notifications: NotificationRow[] }) {
  const typeBadgeClass: Record<string, string> = {
    system_alert: "bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200",
    payment_due: "bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200",
    payment_overdue: "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200",
    loan_approved: "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200",
    loan_rejected: "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200",
    cycle_completed: "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200",
    payment_recorded: "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300",
  };

  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4">
      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
        <i className="fas fa-history" />
        Recent Notifications
      </h3>
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
        Latest system notifications.
      </p>
      <div className="space-y-2 max-h-[320px] overflow-y-auto">
        {notifications.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400 py-4 text-center">
            No notifications yet.
          </p>
        ) : (
          notifications.map((n) => (
            <div
              key={n.id}
              className="flex justify-between items-start gap-2 p-2 border border-gray-100 dark:border-gray-800 rounded text-sm"
            >
              <div className="min-w-0 flex-1">
                <div className="font-medium text-gray-900 dark:text-gray-100 truncate">
                  {n.title}
                </div>
                <div className="text-gray-500 dark:text-gray-400 truncate text-xs">
                  {n.message.slice(0, 50)}
                  {n.message.length > 50 ? "..." : ""}
                </div>
                <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                  {new Date(n.createdAt).toLocaleString(undefined, {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
              </div>
              <span
                className={`flex-shrink-0 px-2 py-0.5 rounded text-xs font-medium ${
                  typeBadgeClass[n.notificationType] ?? "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                }`}
              >
                {n.notificationType.replace(/_/g, " ")}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
