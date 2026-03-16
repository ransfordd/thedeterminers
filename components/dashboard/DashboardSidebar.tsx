import Link from "next/link";

export interface SidebarLink {
  href: string;
  label: string;
  icon: string;
}

const adminLinks: SidebarLink[] = [
  { href: "/admin", label: "Dashboard", icon: "fa-tachometer-alt" },
  { href: "/admin/notifications", label: "Notifications", icon: "fa-bell" },
  { href: "/admin/products", label: "Loan Products", icon: "fa-box" },
  { href: "/admin/applications", label: "Loan Applications", icon: "fa-file-alt" },
  { href: "/admin/clients", label: "Client Management", icon: "fa-users" },
  { href: "/admin/agents", label: "Agent Management", icon: "fa-user-tie" },
  { href: "/admin/transactions", label: "Transactions", icon: "fa-exchange-alt" },
  { href: "/admin/pending-transfers", label: "Pending Transfers", icon: "fa-exchange-alt" },
  { href: "/admin/emergency-withdrawals", label: "Emergency Withdrawals", icon: "fa-exclamation-triangle" },
  { href: "/admin/reports", label: "Financial Reports", icon: "fa-chart-bar" },
  { href: "/admin/revenue", label: "Revenue Dashboard", icon: "fa-chart-line" },
  { href: "/admin/agent-reports", label: "Agent Reports", icon: "fa-user-chart" },
  { href: "/admin/settings", label: "System Settings", icon: "fa-cog" },
];

const managerLinks: SidebarLink[] = [
  { href: "/manager", label: "Dashboard", icon: "fa-tachometer-alt" },
  { href: "/manager/agents", label: "Agents", icon: "fa-user-tie" },
  { href: "/manager/clients", label: "Clients", icon: "fa-users" },
  { href: "/manager/transactions", label: "Transactions", icon: "fa-exchange-alt" },
  { href: "/manager/pending-transfers", label: "Pending Transfers", icon: "fa-exchange-alt" },
  { href: "/manager/withdrawals", label: "Withdrawals", icon: "fa-hand-holding-usd" },
  { href: "/manager/payments", label: "Record Payments", icon: "fa-credit-card" },
  { href: "/manager/reports", label: "Reports", icon: "fa-chart-bar" },
  { href: "/manager/notifications", label: "Notifications", icon: "fa-bell" },
];

const agentLinks: SidebarLink[] = [
  { href: "/agent", label: "Dashboard", icon: "fa-tachometer-alt" },
  { href: "/agent/collect", label: "Record Payment", icon: "fa-plus-circle" },
  { href: "/agent/clients", label: "My Clients", icon: "fa-users" },
  { href: "/agent/applications/new", label: "New Application", icon: "fa-file-alt" },
  { href: "/agent/applications", label: "Applications", icon: "fa-clipboard-list" },
  { href: "/agent/transaction-history", label: "Transaction History", icon: "fa-history" },
  { href: "/agent/commission", label: "Commission", icon: "fa-percentage" },
];

const clientLinks: SidebarLink[] = [
  { href: "/client", label: "Dashboard", icon: "fa-tachometer-alt" },
  { href: "/client/susu", label: "Susu Schedule", icon: "fa-calendar-alt" },
  { href: "/client/loans", label: "Loan Schedule", icon: "fa-file-invoice-dollar" },
  { href: "/client/savings", label: "Savings Account", icon: "fa-piggy-bank" },
  { href: "/client/apply-loan", label: "Apply for Loan", icon: "fa-file-alt" },
  { href: "/client/notifications", label: "Notifications", icon: "fa-bell" },
];

export function getSidebarLinks(role: string): SidebarLink[] {
  switch (role) {
    case "business_admin":
      return adminLinks;
    case "manager":
      return managerLinks;
    case "agent":
      return agentLinks;
    case "client":
      return clientLinks;
    default:
      return [];
  }
}

export interface DashboardSidebarProps {
  role: string;
  currentPath: string;
  className?: string;
}

export function DashboardSidebar({ role, currentPath, className = "" }: DashboardSidebarProps) {
  const links = getSidebarLinks(role);
  if (links.length === 0) return null;

  return (
    <aside
      className={`w-56 flex-shrink-0 border-r border-gray-200 dark:border-gray-700/50 bg-white dark:bg-gray-900 ${className}`}
    >
      <nav className="p-3 space-y-0.5">
        {links.map((link) => {
          const isActive = currentPath === link.href || currentPath.startsWith(link.href + "/");
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition ${
                isActive
                  ? "bg-indigo-600 text-white dark:bg-indigo-600/80"
                  : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              <i className={`fas ${link.icon} w-4 text-center`} aria-hidden />
              {link.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
