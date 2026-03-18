import { getServerSession } from "next-auth";
import { redirect, notFound } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PageHeader, ModernCard } from "@/components/dashboard";
import { formatCurrencyFromGhs } from "@/lib/dashboard";
import { getCurrencyDisplay } from "@/lib/system-settings";
import { ApplicationReviewActions } from "./ApplicationReviewActions";

function toNum(d: unknown): number {
  if (d == null) return 0;
  return typeof d === "number" ? d : Number(d);
}

export default async function AdminApplicationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  const role = (session.user as { role?: string }).role;
  if (role !== "business_admin" && role !== "manager") redirect("/dashboard");

  const id = parseInt((await params).id, 10);
  if (isNaN(id)) notFound();

  const [application, display] = await Promise.all([
    prisma.loanApplication.findUnique({
      where: { id },
      include: {
        client: { include: { user: true, agent: { include: { user: true } } } },
        product: true,
        reviewer: true,
      },
    }),
    getCurrency(),
  ]);
  if (!application) notFound();

  const backHref = "/admin/applications";
  const clientName = `${application.client.user.firstName ?? ""} ${application.client.user.lastName ?? ""}`.trim();
  const agentName = application.client.agent ? `${application.client.agent.user.firstName ?? ""} ${application.client.agent.user.lastName ?? ""}`.trim() : "—";
  const isPending = application.applicationStatus === "pending" || application.applicationStatus === "under_review";

  return (
    <>
      <PageHeader
        title="Loan Application"
        subtitle={`${application.applicationNumber} – ${clientName}`}
        icon={<i className="fas fa-file-alt" />}
        backHref={backHref}
        variant="orange"
      />
      <div className="space-y-4 max-w-3xl">
        <ModernCard title="Application details" subtitle="Client and product" icon={<i className="fas fa-info-circle" />}>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <dt className="text-gray-500 dark:text-gray-400">Application #</dt>
            <dd className="font-medium">{application.applicationNumber}</dd>
            <dt className="text-gray-500 dark:text-gray-400">Client</dt>
            <dd>{clientName} ({application.client.clientCode})</dd>
            <dt className="text-gray-500 dark:text-gray-400">Agent</dt>
            <dd>{agentName}</dd>
            <dt className="text-gray-500 dark:text-gray-400">Product</dt>
            <dd>{application.product.productName}</dd>
            <dt className="text-gray-500 dark:text-gray-400">Requested amount</dt>
            <dd>{formatCurrencyFromGhs(toNum(application.requestedAmount), display)}</dd>
            <dt className="text-gray-500 dark:text-gray-400">Requested term</dt>
            <dd>{application.requestedTermMonths} months</dd>
            <dt className="text-gray-500 dark:text-gray-400">Purpose</dt>
            <dd>{application.purpose}</dd>
            <dt className="text-gray-500 dark:text-gray-400">Status</dt>
            <dd>
              <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                application.applicationStatus === "approved" ? "bg-green-100 text-green-800 dark:bg-green-900/40" :
                application.applicationStatus === "pending" || application.applicationStatus === "under_review" ? "bg-amber-100 text-amber-800 dark:bg-amber-900/40" :
                "bg-red-100 text-red-800 dark:bg-red-900/40"
              }`}>
                {application.applicationStatus}
              </span>
            </dd>
            <dt className="text-gray-500 dark:text-gray-400">Applied</dt>
            <dd>{new Date(application.appliedDate).toLocaleDateString("en-GB")}</dd>
            {application.guarantorName && (
              <>
                <dt className="text-gray-500 dark:text-gray-400">Guarantor</dt>
                <dd>{application.guarantorName} {application.guarantorPhone ? ` – ${application.guarantorPhone}` : ""}</dd>
              </>
            )}
            {application.agentRecommendation && (
              <>
                <dt className="text-gray-500 dark:text-gray-400">Agent recommendation</dt>
                <dd>{application.agentRecommendation}</dd>
              </>
            )}
            {application.reviewDate && (
              <>
                <dt className="text-gray-500 dark:text-gray-400">Reviewed</dt>
                <dd>{new Date(application.reviewDate).toLocaleDateString("en-GB")} {application.reviewer ? `by ${application.reviewer.firstName} ${application.reviewer.lastName}` : ""}</dd>
                {application.reviewNotes && (
                  <>
                    <dt className="text-gray-500 dark:text-gray-400">Review notes</dt>
                    <dd>{application.reviewNotes}</dd>
                  </>
                )}
                {application.applicationStatus === "approved" && application.approvedAmount != null && (
                  <>
                    <dt className="text-gray-500 dark:text-gray-400">Approved amount</dt>
                    <dd>{formatCurrencyFromGhs(toNum(application.approvedAmount), display)}</dd>
                    <dt className="text-gray-500 dark:text-gray-400">Approved term</dt>
                    <dd>{application.approvedTermMonths} months</dd>
                  </>
                )}
              </>
            )}
          </dl>
        </ModernCard>

        {isPending && (
          <ApplicationReviewActions
            applicationId={application.id}
            applicationNumber={application.applicationNumber}
            requestedAmount={toNum(application.requestedAmount)}
            requestedTermMonths={application.requestedTermMonths}
          />
        )}
      </div>
    </>
  );
}
