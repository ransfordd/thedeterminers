import Link from "next/link";
import { ReactNode } from "react";

const variantStyles: Record<string, string> = {
  primary:
    "border-l-4 border-l-blue-500 bg-blue-50/50 dark:bg-blue-950/20 hover:bg-blue-100 dark:hover:bg-blue-950/40",
  success:
    "border-l-4 border-l-green-500 bg-green-50/50 dark:bg-green-950/20 hover:bg-green-100 dark:hover:bg-green-950/40",
  warning:
    "border-l-4 border-l-amber-500 bg-amber-50/50 dark:bg-amber-950/20 hover:bg-amber-100 dark:hover:bg-amber-950/40",
  info: "border-l-4 border-l-cyan-500 bg-cyan-50/50 dark:bg-cyan-950/20 hover:bg-cyan-100 dark:hover:bg-cyan-950/40",
  secondary:
    "border-l-4 border-l-gray-500 bg-gray-50/50 dark:bg-gray-800/30 hover:bg-gray-100 dark:hover:bg-gray-800/50",
  danger:
    "border-l-4 border-l-red-500 bg-red-50/50 dark:bg-red-950/20 hover:bg-red-100 dark:hover:bg-red-950/40",
  dark: "border-l-4 border-l-gray-700 bg-gray-100 dark:bg-gray-800/50 hover:bg-gray-200 dark:hover:bg-gray-800",
};

export interface ActionCardProps {
  href: string;
  icon: ReactNode;
  title: string;
  description: string;
  variant?: keyof typeof variantStyles;
  /** Use native <a> for full page navigation (e.g. when client-side Link fails to open target) */
  useNativeAnchor?: boolean;
}

export function ActionCard({
  href,
  icon,
  title,
  description,
  variant = "primary",
  useNativeAnchor = false,
}: ActionCardProps) {
  const style = variantStyles[variant] ?? variantStyles.primary;
  const className = `block rounded-lg p-4 shadow-sm transition flex items-center gap-3 ${style}`;
  const content = (
    <>
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
    </>
  );
  if (useNativeAnchor) {
    return (
      <a href={href} className={className}>
        {content}
      </a>
    );
  }
  return <Link href={href} className={className}>{content}</Link>;
}
