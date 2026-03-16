import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";

export default async function ManagerPlaceholderPage({
  params,
}: {
  params: Promise<{ slug: string[] }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  if ((session.user as { role?: string }).role !== "manager") redirect("/dashboard");

  const { slug } = await params;
  const title = slug.length ? slug.map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join(" / ") : "Manager";

  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-8 text-center">
      <i className="fas fa-tools text-4xl text-gray-400 dark:text-gray-500 mb-4" />
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{title}</h2>
      <p className="mt-2 text-gray-600 dark:text-gray-400">This page is under construction.</p>
      <a href="/manager" className="inline-block mt-4 text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline">
        Back to Manager Dashboard
      </a>
    </div>
  );
}
