"use client";

import { ReactNode } from "react";

const variantStyles: Record<string, string> = {
  primary:
    "border-l-4 border-l-blue-500 bg-blue-50/50 dark:bg-blue-950/20 hover:bg-blue-100 dark:hover:bg-blue-950/40",
  info: "border-l-4 border-l-cyan-500 bg-cyan-50/50 dark:bg-cyan-950/20 hover:bg-cyan-100 dark:hover:bg-cyan-950/40",
  secondary:
    "border-l-4 border-l-gray-500 bg-gray-50/50 dark:bg-gray-800/30 hover:bg-gray-100 dark:hover:bg-gray-800/50",
};

export function SystemAnalyticsCard({
  href,
  icon,
  title,
  description,
  variant = "primary",
}: {
  href: string;
  icon: ReactNode;
  title: string;
  description: string;
  variant?: keyof typeof variantStyles;
}) {
  const style = variantStyles[variant] ?? variantStyles.primary;
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    window.location.assign(href);
  };
  return (
    <a
      href={href}
      onClick={handleClick}
      className={`block w-full text-left rounded-lg p-4 shadow-sm transition flex items-center gap-3 cursor-pointer no-underline text-inherit ${style}`}
    >
      <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-white/80 dark:bg-gray-900/50 flex items-center justify-center text-lg text-gray-700 dark:text-gray-300">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <h5 className="font-semibold text-gray-900 dark:text-white">{title}</h5>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
          {description}
        </p>
      </div>
      <div className="flex-shrink-0 text-gray-400">
        <i className="fas fa-chevron-right" aria-hidden />
      </div>
    </a>
  );
}
