import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import { getUsersList } from "@/lib/dashboard/pages";
import { PageHeader, ModernCard, StatCard } from "@/components/dashboard";

export default async function AdminUsersPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  if ((session.user as { role?: string }).role !== "business_admin") redirect("/dashboard");

  const users = await getUsersList();
  const byRole = users.reduce(
    (acc, u) => {
      acc[u.role] = (acc[u.role] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );
  const activeCount = users.filter((u) => u.status === "active").length;

  return (
    <>
      <PageHeader
        title="All Users"
        subtitle="View and manage all system users (clients, agents, admins)"
        icon={<i className="fas fa-users" />}
        backHref="/admin"
        variant="primary"
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatCard
          icon={<i className="fas fa-users text-blue-600" />}
          value={users.length.toLocaleString()}
          label="Total Users"
          variant="primary"
        />
        <StatCard
          icon={<i className="fas fa-user-check text-green-600" />}
          value={activeCount.toLocaleString()}
          label="Active"
          variant="success"
        />
        <StatCard
          icon={<i className="fas fa-user-friends text-cyan-600" />}
          value={(byRole.client ?? 0).toLocaleString()}
          label="Clients"
          variant="info"
        />
        <StatCard
          icon={<i className="fas fa-user-tie text-amber-600" />}
          value={(byRole.agent ?? 0).toLocaleString()}
          label="Agents"
          variant="warning"
        />
      </div>
      <ModernCard
        title="User List"
        subtitle="All users by role"
        icon={<i className="fas fa-list" />}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                <th className="text-left py-2 px-3 font-medium text-gray-700 dark:text-gray-300">Name</th>
                <th className="text-left py-2 px-3 font-medium text-gray-700 dark:text-gray-300">Username</th>
                <th className="text-left py-2 px-3 font-medium text-gray-700 dark:text-gray-300">Email</th>
                <th className="text-left py-2 px-3 font-medium text-gray-700 dark:text-gray-300">Role</th>
                <th className="text-left py-2 px-3 font-medium text-gray-700 dark:text-gray-300">Code</th>
                <th className="text-left py-2 px-3 font-medium text-gray-700 dark:text-gray-300">Status</th>
                <th className="text-left py-2 px-3 font-medium text-gray-700 dark:text-gray-300">Action</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-gray-100 dark:border-gray-800">
                  <td className="py-2 px-3 font-medium">
                    {u.firstName} {u.lastName}
                  </td>
                  <td className="py-2 px-3">@{u.username}</td>
                  <td className="py-2 px-3">{u.email}</td>
                  <td className="py-2 px-3">
                    <span
                      className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                        u.role === "business_admin"
                          ? "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-200"
                          : u.role === "agent"
                            ? "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/40 dark:text-cyan-200"
                            : u.role === "client"
                              ? "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200"
                              : "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200"
                      }`}
                    >
                      {u.role.replace("_", " ")}
                    </span>
                  </td>
                  <td className="py-2 px-3">
                    {u.clientCode ?? u.agentCode ?? "—"}
                  </td>
                  <td className="py-2 px-3">
                    <span
                      className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                        u.status === "active"
                          ? "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200"
                          : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400"
                      }`}
                    >
                      {u.status}
                    </span>
                  </td>
                  <td className="py-2 px-3">
                    {u.role === "client" && u.clientId != null && (
                      <Link
                        href={`/admin/user-transactions?client_id=${u.clientId}`}
                        className="text-indigo-600 dark:text-indigo-400 hover:underline text-xs"
                      >
                        Transactions
                      </Link>
                    )}
                    {u.role === "agent" && (
                      <Link
                        href="/admin/agent-reports"
                        className="text-indigo-600 dark:text-indigo-400 hover:underline text-xs"
                      >
                        Reports
                      </Link>
                    )}
                    {(u.role === "business_admin" || u.role === "manager") && "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ModernCard>
    </>
  );
}
