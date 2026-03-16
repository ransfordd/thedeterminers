import Link from "next/link";
import { ReactNode } from "react";

export interface WelcomeBannerProps {
  title: string;
  subtitle: string;
  /** "purple" for client dashboard (previous site look); default is blue/indigo */
  variant?: "default" | "purple";
  /** Optional actions to show before Logout (e.g. Notifications link for admin) */
  rightActions?: ReactNode;
}

export function WelcomeBanner({ title, subtitle, variant = "default", rightActions }: WelcomeBannerProps) {
  const gradientClass =
    variant === "purple"
      ? "bg-gradient-to-r from-purple-600 to-indigo-600"
      : "bg-gradient-to-r from-indigo-600 to-blue-600";
  const subtitleClass = variant === "purple" ? "text-purple-100" : "text-indigo-100";

  return (
    <div className={`rounded-lg ${gradientClass} p-6 mb-6 flex flex-wrap items-center justify-between gap-4`}>
      <div>
        <h1 className="text-2xl font-bold text-white">
          {title}
        </h1>
        <p className={`${subtitleClass} mt-0.5`}>
          {subtitle}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {rightActions}
        <Link
          href="/api/auth/signout"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white/20 hover:bg-white/30 text-white font-medium text-sm border border-white/40 transition"
        >
          <i className="fas fa-sign-out-alt" /> Logout
        </Link>
      </div>
    </div>
  );
}
