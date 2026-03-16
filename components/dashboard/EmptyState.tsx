import { ReactNode } from "react";

export interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  message?: string;
}

export function EmptyState({ icon, title, message }: EmptyStateProps) {
  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-8 text-center">
      {icon && (
        <div className="text-gray-400 dark:text-gray-500 mb-3 text-3xl">
          {icon}
        </div>
      )}
      <h6 className="font-medium text-gray-700 dark:text-gray-300">{title}</h6>
      {message && (
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {message}
        </p>
      )}
    </div>
  );
}
