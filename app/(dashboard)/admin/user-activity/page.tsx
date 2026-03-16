import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import { getUserActivitiesForPage } from "@/lib/dashboard";
import { PageHeader, ModernCard } from "@/components/dashboard";
const PAGE_SIZE = 20;

export default async function AdminUserActivityPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; user_id?: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  if ((session.user as { role?: string }).role !== "business_admin") redirect("/dashboard");

  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page ?? "1", 10));
  const userId = params.user_id ? parseInt(params.user_id, 10) : null;
  const offset = (page - 1) * PAGE_SIZE;

  const { activities, total } = await getUserActivitiesForPage(userId, PAGE_SIZE, offset).catch(
    () => ({ activities: [], total: 0 })
  );
  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <>
      <PageHeader
        title="User Activity Log"
        subtitle="View detailed user activities with advanced filtering"
        icon={<i className="fas fa-history" />}
        backHref="/admin"
        variant="primary"
      />
      <ModernCard
        title="Activity Log"
        subtitle={`${total} total entries`}
        icon={<i className="fas fa-list-alt" />}
      >
        <div className="overflow-x-auto">
          {activities.length === 0 ? (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              <i className="fas fa-history fa-3x mb-3 opacity-50" />
              <p>No activities found.</p>
              <p className="text-sm mt-1">Activity is recorded when users log in, make payments, and perform other actions.</p>
            </div>
          ) : (
            <>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                    <th className="text-left py-2 px-3 font-medium text-gray-700 dark:text-gray-300">Date & Time</th>
                    <th className="text-left py-2 px-3 font-medium text-gray-700 dark:text-gray-300">User</th>
                    <th className="text-left py-2 px-3 font-medium text-gray-700 dark:text-gray-300">Activity</th>
                    <th className="text-left py-2 px-3 font-medium text-gray-700 dark:text-gray-300">Description</th>
                  </tr>
                </thead>
                <tbody>
                  {activities.map((a) => (
                    <tr key={a.id} className="border-b border-gray-100 dark:border-gray-800">
                      <td className="py-2 px-3 whitespace-nowrap">
                        {new Date(a.createdAt).toLocaleString("en-GB", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="py-2 px-3">
                        <strong>{a.firstName} {a.lastName}</strong>
                        <br />
                        <span className="text-xs text-gray-500">@{a.username}</span>
                      </td>
                      <td className="py-2 px-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200 capitalize">
                          {a.activityType.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-gray-600 dark:text-gray-400">{a.activityDescription}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-200 dark:border-gray-700">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Page {page} of {totalPages}
                  </p>
                  <div className="flex gap-2">
                    {page > 1 && (
                      <Link
                        href={`/admin/user-activity?page=${page - 1}${userId != null ? `&user_id=${userId}` : ""}`}
                        className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                      >
                        Previous
                      </Link>
                    )}
                    {page < totalPages && (
                      <Link
                        href={`/admin/user-activity?page=${page + 1}${userId != null ? `&user_id=${userId}` : ""}`}
                        className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                      >
                        Next
                      </Link>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </ModernCard>
    </>
  );
}
