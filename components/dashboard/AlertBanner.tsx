import { ReactNode } from "react";

const variantStyles: Record<string, string> = {
  warning:
    "bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200",
  info: "bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200",
  success:
    "bg-green-50 dark:bg-green-950/40 border-green-200 dark:border-green-800 text-green-800 dark:text-green-200",
  danger:
    "bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200",
};

export interface AlertBannerProps {
  type: "warning" | "info" | "success" | "danger";
  message: string;
  icon?: ReactNode;
}

export function AlertBanner({ type, message, icon }: AlertBannerProps) {
  const style = variantStyles[type] ?? variantStyles.info;
  return (
    <div
      className={`rounded-lg border px-4 py-3 flex items-center gap-2 ${style}`}
      role="alert"
    >
      {icon ?? (
        <span className="flex-shrink-0">
          <i className="fas fa-exclamation-triangle" aria-hidden />
        </span>
      )}
      <p className="text-sm font-medium">{message}</p>
    </div>
  );
}
