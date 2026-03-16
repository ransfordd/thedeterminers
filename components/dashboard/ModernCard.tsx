import { ReactNode } from "react";

export interface ModernCardProps {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function ModernCard({ title, subtitle, icon, children, className = "" }: ModernCardProps) {
  return (
    <div
      className={`rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-hidden shadow-sm ${className}`}
    >
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 flex items-center gap-3">
        {icon && (
          <span className="flex-shrink-0 w-9 h-9 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
            {icon}
          </span>
        )}
        <div>
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">{title}</h2>
          {subtitle && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{subtitle}</p>
          )}
        </div>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}
