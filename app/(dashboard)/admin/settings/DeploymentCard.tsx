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
        Database seed runs automatically on each deployment (Docker/Compose startup). It ensures default system settings and default users (admin, manager, agent, client) exist. You can also run it manually below.
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
