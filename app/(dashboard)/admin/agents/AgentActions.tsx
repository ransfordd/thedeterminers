"use client";

import Link from "next/link";
import { useFormStatus } from "react-dom";
import { signIn } from "next-auth/react";
import { useState } from "react";
import { toggleAgentStatusForm } from "@/app/actions/agents";
import { getImpersonationToken } from "@/app/actions/impersonate";

type Row = { id: number; userId: number; status: string };

export function AgentActions({ row, isAdmin }: { row: Row; isAdmin: boolean }) {
  const [impersonating, setImpersonating] = useState(false);
  async function handleImpersonate() {
    setImpersonating(true);
    try {
      const res = await getImpersonationToken(row.userId, "/agent");
      if (res.error) {
        alert(res.error);
        return;
      }
      if (res.token && res.callbackUrl) {
        if (res.exitToken && typeof sessionStorage !== "undefined") sessionStorage.setItem("exit_impersonation", res.exitToken);
        await signIn("credentials", {
          impersonationToken: res.token,
          callbackUrl: res.callbackUrl,
          redirect: true,
        });
      }
    } finally {
      setImpersonating(false);
    }
  }
  return (
    <div className="flex items-center gap-1">
      {isAdmin && (
        <button
          type="button"
          onClick={handleImpersonate}
          disabled={impersonating}
          className="inline-flex rounded border border-indigo-500 bg-transparent px-2 py-1 text-xs text-indigo-600 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-950/30 disabled:opacity-50"
          title="Sign in as this agent"
        >
          <i className={`fas ${impersonating ? "fa-spinner fa-spin" : "fa-sign-in-alt"} mr-1`} /> Login
        </button>
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
