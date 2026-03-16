"use client";

import { useState, useEffect } from "react";
import { signIn } from "next-auth/react";

const STORAGE_KEY = "exit_impersonation";

export function ImpersonationBanner({ role }: { role: string }) {
  const [show, setShow] = useState(false);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || (role !== "client" && role !== "agent")) return;
    if (sessionStorage.getItem(STORAGE_KEY)) setShow(true);
  }, [role]);

  async function handleExit() {
    const exitToken = typeof window !== "undefined" ? sessionStorage.getItem(STORAGE_KEY) : null;
    if (!exitToken) return;
    setExiting(true);
    try {
      const { exitImpersonation } = await import("@/app/actions/impersonate");
      const res = await exitImpersonation(exitToken);
      if (res.error) {
        alert(res.error);
        return;
      }
      if (res.restoreToken && res.callbackUrl) {
        sessionStorage.removeItem(STORAGE_KEY);
        await signIn("credentials", {
          impersonationToken: res.restoreToken,
          callbackUrl: res.callbackUrl,
          redirect: true,
        });
      }
    } finally {
      setExiting(false);
    }
  }

  if (!show) return null;

  return (
    <div className="bg-amber-500 text-amber-950 px-4 py-2 flex flex-wrap items-center justify-center gap-3 text-sm font-medium">
      <span>
        <i className="fas fa-user-secret mr-1.5" />
        You are viewing as {role === "client" ? "Client" : "Agent"}.
      </span>
      <button
        type="button"
        onClick={handleExit}
        disabled={exiting}
        className="inline-flex items-center gap-1.5 rounded bg-amber-900 text-white px-3 py-1.5 hover:bg-amber-800 disabled:opacity-70"
      >
        {exiting ? <i className="fas fa-spinner fa-spin" /> : <i className="fas fa-arrow-left" />}
        Back to Admin Dashboard
      </button>
    </div>
  );
}
