"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { DashboardSidebar } from "./DashboardSidebar";

export interface DashboardShellProps {
  role: string;
  children: React.ReactNode;
}

export function DashboardShell({ role, children }: DashboardShellProps) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex flex-1 min-h-0 relative">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <button
          type="button"
          className="fixed inset-0 z-20 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-label="Close menu"
        />
      )}
      {/* Sidebar - hidden on mobile unless open */}
      <div
        className={`fixed lg:static inset-y-0 left-0 z-30 transform transition-transform duration-200 ease-out lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        style={{ top: "52px" }}
      >
        <DashboardSidebar role={role} currentPath={pathname ?? ""} className="h-full" />
      </div>
      {/* Main content */}
      <div className="flex-1 min-w-0 flex flex-col">
        <div className="lg:hidden flex items-center gap-2 p-2 border-b border-gray-200 dark:border-gray-700/50 bg-white dark:bg-gray-800">
          <button
            type="button"
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300"
            onClick={() => setSidebarOpen((o) => !o)}
            aria-label="Toggle menu"
          >
            <i className="fas fa-bars" aria-hidden />
          </button>
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Menu</span>
        </div>
        <main className="flex-1 p-4 lg:p-6 text-gray-900 dark:text-gray-100">
          {children}
        </main>
      </div>
    </div>
  );
}
