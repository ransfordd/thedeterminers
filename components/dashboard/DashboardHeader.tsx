"use client";

import { useState, useRef, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ThemeToggle } from "./ThemeToggle";
import { markAllNotificationsRead } from "@/app/actions/notifications";

export interface DashboardNotificationItem {
  id: number;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: Date | string;
}

export interface DashboardHeaderProps {
  user: {
    name: string | null;
    image: string | null;
    role: string;
  };
  appName?: string;
  appLogoPath?: string | null;
  notifications: DashboardNotificationItem[];
  notificationsHref: string;
}

const roleLabels: Record<string, string> = {
  business_admin: "Business Admin",
  manager: "Manager",
  agent: "Agent",
  client: "Client",
};

const dashboardHrefByRole: Record<string, string> = {
  business_admin: "/admin",
  manager: "/manager",
  agent: "/agent",
  client: "/client",
};

function formatRelativeTime(date: Date): string {
  const d = new Date(date);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMins = Math.floor(diffMs / (1000 * 60));
  if (diffDays > 0) return `${diffDays}d ago`;
  if (diffHours > 0) return `${diffHours}h ago`;
  if (diffMins > 0) return `${diffMins}m ago`;
  return "Just now";
}

export function DashboardHeader({
  user,
  appName = "The Determiners Susu System",
  appLogoPath = null,
  notifications,
  notificationsHref,
}: DashboardHeaderProps) {
  const [notifOpen, setNotifOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const [isPendingMarkRead, startMarkReadTransition] = useTransition();
  const router = useRouter();
  const notifRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);

  function handleMarkAllRead() {
    startMarkReadTransition(async () => {
      const result = await markAllNotificationsRead();
      if (result?.success) {
        setNotifOpen(false);
        router.refresh();
      }
    });
  }

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (notifRef.current && !notifRef.current.contains(target)) setNotifOpen(false);
      if (userRef.current && !userRef.current.contains(target)) setUserOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const dashboardHref = dashboardHrefByRole[user.role] ?? "/dashboard";
  const roleLabel = roleLabels[user.role] ?? user.role;
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <header className="flex-shrink-0 bg-white dark:bg-gray-900 text-gray-900 dark:text-white px-4 py-3 flex items-center justify-between w-full border-b border-gray-200 dark:border-gray-800 shadow-sm dark:shadow-none">
      <Link href="/dashboard" className="flex items-center gap-3">
        {appLogoPath ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={appLogoPath}
            alt=""
            className="h-10 w-auto max-w-[160px] object-contain"
          />
        ) : (
          <span className="flex items-center justify-center w-10 h-10 rounded-lg bg-indigo-600 text-white">
            <i className="fas fa-coins text-xl" aria-hidden />
          </span>
        )}
        <span className="font-semibold text-gray-900 dark:text-white leading-tight max-w-[50vw] sm:max-w-md">
          {appName}
        </span>
      </Link>

      <div className="flex items-center gap-2">
        <ThemeToggle />
        {/* Notifications */}
        <div className="relative" ref={notifRef}>
          <button
            type="button"
            onClick={() => {
              setNotifOpen((o) => !o);
              setUserOpen(false);
            }}
            className="relative p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 text-gray-700 dark:text-white"
            aria-label="Notifications"
            aria-expanded={notifOpen}
          >
            <i className="fas fa-bell text-lg" aria-hidden />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] rounded-full bg-red-500 text-white text-xs font-medium flex items-center justify-center px-1">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </button>
          {notifOpen && (
            <div className="absolute right-0 top-full mt-1 w-80 max-w-[90vw] bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 py-2 z-50">
              <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700">
                <h3 className="font-semibold text-gray-900 dark:text-white">Notifications</h3>
              </div>
              <div className="max-h-64 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="px-4 py-6 text-center text-gray-500 dark:text-gray-400 text-sm">
                    <i className="fas fa-bell-slash text-2xl mb-2 block opacity-50" />
                    No new notifications
                  </div>
                ) : (
                  <ul className="divide-y divide-gray-100 dark:divide-gray-700">
                    {notifications.map((n) => (
                      <li key={n.id} className="px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <p className="font-medium text-gray-900 dark:text-white text-sm">{n.title}</p>
                        <p className="text-xs text-gray-600 dark:text-gray-300 line-clamp-2 mt-0.5">
                          {n.message}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {formatRelativeTime(new Date(n.createdAt))}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="border-t border-gray-200 dark:border-gray-700 px-4 py-2 flex flex-col gap-1">
                <Link
                  href={notificationsHref}
                  onClick={() => setNotifOpen(false)}
                  className="text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  View All Notifications
                </Link>
                <button
                  type="button"
                  onClick={handleMarkAllRead}
                  disabled={isPendingMarkRead || unreadCount === 0}
                  className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white text-left disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isPendingMarkRead ? "Updating…" : "Mark All as Read"}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* User menu */}
        <div className="relative" ref={userRef}>
          <button
            type="button"
            onClick={() => {
              setUserOpen((o) => !o);
              setNotifOpen(false);
            }}
            className="flex items-center gap-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 py-1.5 pr-2 pl-1.5 text-gray-900 dark:text-white"
            aria-label="User menu"
            aria-expanded={userOpen}
          >
            <span className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center overflow-hidden">
              {user.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={user.image}
                  alt=""
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-sm font-medium">
                  {(user.name ?? "U").charAt(0).toUpperCase()}
                </span>
              )}
            </span>
            <span className="font-medium text-gray-900 dark:text-white hidden sm:inline max-w-[120px] truncate">
              {user.name ?? "User"}
            </span>
            <i
              className={`fas fa-chevron-down text-xs transition-transform ${userOpen ? "rotate-180" : ""}`}
              aria-hidden
            />
          </button>
          {userOpen && (
            <div className="absolute right-0 top-full mt-1 w-56 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 py-2 z-50">
              <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700 flex items-center gap-3">
                <span className="flex-shrink-0 w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center text-indigo-600 dark:text-indigo-300 font-semibold overflow-hidden">
                  {user.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={user.image} alt="" className="w-full h-full object-cover" />
                  ) : (
                    (user.name ?? "U").charAt(0).toUpperCase()
                  )}
                </span>
                <div className="min-w-0">
                  <p className="font-medium text-gray-900 dark:text-white truncate">
                    {user.name ?? "User"}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{roleLabel}</p>
                </div>
              </div>
              <div className="py-1">
                <Link
                  href={dashboardHref}
                  onClick={() => setUserOpen(false)}
                  className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  <i className="fas fa-tachometer-alt w-4 text-center" /> Dashboard
                </Link>
                <Link
                  href="/account/settings"
                  onClick={() => setUserOpen(false)}
                  className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  <i className="fas fa-cog w-4 text-center" /> Account Settings
                </Link>
                <Link
                  href="/account/password"
                  onClick={() => setUserOpen(false)}
                  className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  <i className="fas fa-key w-4 text-center" /> Change Password
                </Link>
                <Link
                  href="/api/auth/signout"
                  onClick={() => setUserOpen(false)}
                  className="flex items-center gap-2 px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  <i className="fas fa-sign-out-alt w-4 text-center" /> Logout
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
