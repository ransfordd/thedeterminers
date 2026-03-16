import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { getClientByUserId } from "@/lib/dashboard";
import { getClientSusuSchedule, formatCurrency } from "@/lib/dashboard";
import { PageHeader, ModernCard, DataTable } from "@/components/dashboard";

export default async function ClientSusuPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  if ((session.user as { role?: string }).role !== "client") redirect("/dashboard");

  const userId = (session.user as { id?: string }).id;
  const client = await getClientByUserId(userId ? parseInt(String(userId), 10) : 0);
  if (!client) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/30 p-6 text-center">
        <p className="font-medium text-amber-800">Client record not found.</p>
        <a href="/client" className="inline-block mt-3 text-sm text-blue-600 hover:underline">Back to Dashboard</a>
      </div>
    );
  }

  const schedule = await getClientSusuSchedule(client.id);
  const columns = [
    { key: "dayNumber", header: "Day", render: (r: { dayNumber: number }) => <span className="font-medium">{r.dayNumber}</span> },
    { key: "collectionDate", header: "Date", render: (r: { collectionDate: Date }) => new Date(r.collectionDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) },
    { key: "expectedAmount", header: "Expected", render: (r: { expectedAmount: number }) => formatCurrency(r.expectedAmount) },
    { key: "collectedAmount", header: "Collected", render: (r: { collectedAmount: number }) => formatCurrency(r.collectedAmount) },
    { key: "collectionStatus", header: "Status", render: (r: { collectionStatus: string }) => <span className={`px-2 py-0.5 rounded text-xs font-medium ${r.collectionStatus === "collected" ? "bg-green-100 text-green-800 dark:bg-green-900/40" : r.collectionStatus === "pending" ? "bg-amber-100 text-amber-800 dark:bg-amber-900/40" : "bg-gray-100 text-gray-800"}`}>{r.collectionStatus}</span> },
  ];

  return (
    <>
      <PageHeader
        title="Susu Schedule"
        subtitle="Track your daily Susu collection schedule and progress"
        icon={<i className="fas fa-calendar-alt" />}
        backHref="/client"
        variant="purple"
      />
      <ModernCard
        title="Collection Schedule"
        subtitle="Your daily Susu collection timeline"
        icon={<i className="fas fa-table" />}
      >
        <DataTable
          columns={columns}
          data={schedule}
          emptyMessage="You don't have an active Susu cycle. Contact your agent to start a new cycle."
        />
      </ModernCard>
    </>
  );
}
