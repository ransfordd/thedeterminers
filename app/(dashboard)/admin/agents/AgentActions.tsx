"use client";

import Link from "next/link";
import { useFormStatus } from "react-dom";
import { toggleAgentStatusForm } from "@/app/actions/agents";

type Row = { id: number; status: string };

export function AgentActions({ row, isAdmin }: { row: Row; isAdmin: boolean }) {
  return (
    <div className="flex items-center gap-1">
      {isAdmin && (
        <span
          className="inline-flex cursor-not-allowed rounded border border-gray-300 bg-gray-100 px-2 py-1 text-xs text-gray-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-400"
          title="Impersonation coming soon"
        >
          <i className="fas fa-sign-in-alt mr-1" /> Login
        </span>
      )}
      <Link
        href={`/admin/agents/${row.id}/edit`}
        className="inline-flex rounded border border-blue-500 bg-transparent p-1.5 text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950/30"
        title="Edit Agent"
      >
        <i className="fas fa-edit" />
      </Link>
      {row.status === "active" ? (
        <form
          action={async (formData: FormData) => {
            await toggleAgentStatusForm(undefined, formData);
          }}
          className="inline"
          onSubmit={(e) => !confirm("Are you sure you want to deactivate this agent?") && e.preventDefault()}
        >
          <input type="hidden" name="agentId" value={row.id} />
          <SubmitButton title="Deactivate Agent" icon="fa-user-slash" variant="danger" />
        </form>
      ) : (
        <form
          action={async (formData: FormData) => {
            await toggleAgentStatusForm(undefined, formData);
          }}
          className="inline"
          onSubmit={(e) => !confirm("Are you sure you want to activate this agent?") && e.preventDefault()}
        >
          <input type="hidden" name="agentId" value={row.id} />
          <SubmitButton title="Activate Agent" icon="fa-user-check" variant="success" />
        </form>
      )}
    </div>
  );
}

function SubmitButton({ title, icon, variant }: { title: string; icon: string; variant: "danger" | "success" }) {
  const { pending } = useFormStatus();
  const cls = variant === "danger"
    ? "border-red-500 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30"
    : "border-green-500 text-green-600 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-950/30";
  return (
    <button
      type="submit"
      disabled={pending}
      className={`inline-flex rounded border bg-transparent p-1.5 ${cls}`}
      title={title}
    >
      <i className={`fas ${icon}`} />
    </button>
  );
}
