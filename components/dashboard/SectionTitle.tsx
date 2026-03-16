import { ReactNode } from "react";

export interface SectionTitleProps {
  icon: ReactNode;
  children: ReactNode;
  className?: string;
}

export function SectionTitle({ icon, children, className = "" }: SectionTitleProps) {
  return (
    <h4
      className={`text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-3 ${className}`}
    >
      <span className="text-gray-500 dark:text-gray-400">{icon}</span>
      {children}
    </h4>
  );
}
