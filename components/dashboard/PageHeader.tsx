import Link from "next/link";
import { ReactNode } from "react";

export interface PageHeaderProps {
  title: string;
  subtitle: string;
  icon: ReactNode;
  backHref?: string;
  backLabel?: string;
  primaryAction?: { href: string; label: string; icon?: ReactNode };
  /** Optional gradient style like PHP: "primary" | "orange" | "purple" | "green" */
  variant?: "primary" | "orange" | "purple" | "green" | "blue";
}

const variantStyles: Record<string, string> = {
  primary: "bg-gradient-to-r from-blue-600 to-blue-800 dark:from-blue-900 dark:to-blue-950",
  orange: "bg-gradient-to-r from-orange-500 to-orange-700 dark:from-orange-900 dark:to-orange-950",
  purple: "bg-gradient-to-r from-indigo-600 to-purple-700 dark:from-indigo-900 dark:to-purple-950",
  green: "bg-gradient-to-r from-green-600 to-green-800 dark:from-emerald-900 dark:to-green-950",
  blue: "bg-gradient-to-r from-cyan-600 to-blue-600 dark:from-cyan-900 dark:to-blue-950",
};

export function PageHeader({
  title,
  subtitle,
  icon,
  backHref,
  backLabel = "Back to Dashboard",
  primaryAction,
  variant = "primary",
}: PageHeaderProps) {
  const bg = variantStyles[variant] ?? variantStyles.primary;
  return (
    <div className={`${bg} text-white rounded-xl p-6 mb-6 shadow-sm`}>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="flex-shrink-0 w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center text-xl">
            {icon}
          </span>
          <div>
            <h1 className="text-xl font-bold">{title}</h1>
            <p className="text-white/90 text-sm mt-0.5">{subtitle}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {primaryAction && (
            <Link
              href={primaryAction.href}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white text-gray-900 font-medium text-sm hover:bg-gray-100"
            >
              {primaryAction.icon ?? <i className="fas fa-plus" />}
              {primaryAction.label}
            </Link>
          )}
          {backHref != null && backHref !== "" && (
            <Link
              href={backHref}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white/20 text-white text-sm font-medium hover:bg-white/30"
            >
              <i className="fas fa-arrow-left" />
              {backLabel}
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
