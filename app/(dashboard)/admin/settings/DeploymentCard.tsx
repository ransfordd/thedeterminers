"use client";

import { useActionState } from "react";
import { runSeedNow, type RunSeedState } from "@/app/actions/seed";

const initialState: RunSeedState = {};

export function DeploymentCard() {
  const [state, formAction] = useActionState(runSeedNow, initialState);

  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4">
      <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-2">
        <i className="fas fa-rocket text-indigo-500" />
        Deployment &amp; seeding
      </h3>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
        On deploy, Docker Compose runs <strong className="font-medium text-gray-700 dark:text-gray-300">prisma db push</strong> only (schema sync). Seed is <strong className="font-medium text-gray-700 dark:text-gray-300">not</strong> run automatically — use the button below for first install or to ensure default system settings and demo users exist. Re-seed does not delete live clients, loans, or transactions.
      </p>
      <form action={formAction} className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium transition-colors"
        >
          <i className="fas fa-database" />
          Run seed now
        </button>
        {state?.success && (
          <span className="text-sm text-green-600 dark:text-green-400">
            <i className="fas fa-check-circle mr-1" /> Seed completed.
          </span>
        )}
        {state?.error && (
          <span className="text-sm text-red-600 dark:text-red-400">
            <i className="fas fa-exclamation-circle mr-1" /> {state.error}
          </span>
        )}
      </form>
    </div>
  );
}
