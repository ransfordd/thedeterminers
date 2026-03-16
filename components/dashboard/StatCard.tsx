import Link from "next/link";
import { ReactNode } from "react";

const variantStyles: Record<string, string> = {
  primary: "border-t-4 border-t-blue-500",
  success: "border-t-4 border-t-green-500",
  warning: "border-t-4 border-t-amber-500",
  danger: "border-t-4 border-t-red-500",
  info: "border-t-4 border-t-cyan-500",
  secondary: "border-t-4 border-t-gray-500",
};

export interface StatCardProps {
  icon: ReactNode;
  value: string | number;
  label: string;
  sublabel?: string;
  variant?: keyof typeof variantStyles;
  href?: string;
}

export function StatCard({
  icon,
  value,
  label,
  sublabel,
  variant = "primary",
  href,
}: StatCardProps) {
  const baseClass =
    "rounded-lg p-4 shadow-sm flex items-start gap-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 " +
    (variantStyles[variant] ?? variantStyles.primary);

  const content = (
    <>
      <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-lg text-gray-600 dark:text-gray-300">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-2xl font-bold text-gray-900 dark:text-white truncate">
          {value}
        </p>
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
        </p>
        {sublabel && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            {sublabel}
          </p>
        )}
      </div>
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        className={`block transition hover:opacity-90 ${baseClass}`}
      >
        {content}
      </Link>
    );
  }

  return <div className={baseClass}>{content}</div>;
}
