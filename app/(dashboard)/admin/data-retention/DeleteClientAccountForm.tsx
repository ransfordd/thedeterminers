"use client";

import { useActionState, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import {
  bulkDeleteClientAccountAdmin,
  deleteClientAccountAdmin,
  dryRunDeleteClientAccountAdmin,
  exportDeleteClientDataAdmin,
  previewDeleteClientAccountAdmin,
  type DeleteClientAccountState,
} from "@/app/actions/admin-data-retention";

const initial: DeleteClientAccountState = {};

function ActionButton({
  label,
  pendingLabel,
  className,
}: {
  label: string;
  pendingLabel: string;
  className: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={className}>
      {pending ? pendingLabel : label}
    </button>
  );
}

function DownloadButton({ filename, mimeType, content }: { filename: string; mimeType: string; content: string }) {
  return (
    <button
      type="button"
      onClick={() => {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
      }}
      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700"
    >
      Download file: {filename}
    </button>
  );
}

export type ClientOption = { id: number; clientCode: string; name: string };

export function DeleteClientAccountForm({
  clients,
  history,
}: {
  clients: ClientOption[];
  history: NonNullable<DeleteClientAccountState["history"]>;
}) {
  const [selectedClientId, setSelectedClientId] = useState("");
  const [bulkSelected, setBulkSelected] = useState<number[]>([]);
  const [exportFormat, setExportFormat] = useState<"json" | "csv">("json");

  const [previewState, previewAction] = useActionState(previewDeleteClientAccountAdmin, initial);
  const [dryRunState, dryRunAction] = useActionState(dryRunDeleteClientAccountAdmin, initial);
  const [exportState, exportAction] = useActionState(exportDeleteClientDataAdmin, initial);
  const [deleteState, deleteAction] = useActionState(deleteClientAccountAdmin, initial);
  const [bulkState, bulkAction] = useActionState(bulkDeleteClientAccountAdmin, initial);

  const selectedClient = useMemo(
    () => clients.find((c) => String(c.id) === selectedClientId),
    [clients, selectedClientId]
  );
  const mergedPreview = previewState.preview ?? dryRunState.preview ?? exportState.preview ?? deleteState.preview;
  const mergedError =
    deleteState.error ?? bulkState.error ?? dryRunState.error ?? exportState.error ?? previewState.error;
  const mergedSuccess =
    deleteState.message ?? bulkState.message ?? dryRunState.message ?? exportState.message ?? previewState.message;

  return (
    <div className="space-y-8">
      {(mergedError || mergedSuccess) && (
        <div className="space-y-2">
          {mergedError && (
            <div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30 text-red-800 dark:text-red-200 px-4 py-3 text-sm">
              {mergedError}
            </div>
          )}
          {mergedSuccess && (
            <div className="rounded-lg border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/30 text-green-800 dark:text-green-200 px-4 py-3 text-sm">
              {mergedSuccess}
            </div>
          )}
        </div>
      )}

      <section className="space-y-4 max-w-2xl">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Remove one client</h3>
        <div>
          <label htmlFor="clientId" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Select client
          </label>
          <select
            id="clientId"
            name="clientId"
            required
            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
            value={selectedClientId}
            onChange={(e) => setSelectedClientId(e.target.value)}
          >
            <option value="" disabled>
              Choose a client...
            </option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.clientCode} — {c.name}
              </option>
            ))}
          </select>
        </div>

        <form action={previewAction} className="flex items-center gap-3">
          <input type="hidden" name="clientId" value={selectedClientId} />
          <ActionButton
            label="See what will be removed"
            pendingLabel="Checking..."
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-60"
          />
        </form>

        {mergedPreview && (
          <div className="rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50/70 dark:bg-amber-950/20 p-4 text-sm space-y-2">
            <p className="font-semibold">
              For {mergedPreview.clientCode}, this action will remove {mergedPreview.totalRecords} item(s).
            </p>
            {mergedPreview.hasBlockingLoan && (
              <p className="text-amber-700 dark:text-amber-300">
                This client has {mergedPreview.blockingLoanCount} active or overdue loan(s). You must turn on override and give a reason.
              </p>
            )}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {Object.entries(mergedPreview.counts).map(([key, value]) => (
                <div key={key} className="rounded bg-white/70 dark:bg-gray-900/40 px-2 py-1">
                  <span className="font-medium">{key}</span>: {value}
                </div>
              ))}
            </div>
          </div>
        )}

        <form action={exportAction} className="flex flex-wrap items-center gap-3">
          <input type="hidden" name="clientId" value={selectedClientId} />
          <input type="hidden" name="exportFormat" value={exportFormat} />
          <select
            value={exportFormat}
            onChange={(e) => setExportFormat((e.target.value as "json" | "csv") || "json")}
            className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
          >
            <option value="json">Download as JSON file</option>
            <option value="csv">Download as CSV file</option>
          </select>
          <ActionButton
            label="Prepare download file"
            pendingLabel="Preparing file..."
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-60"
          />
          {exportState.exportFilename && exportState.exportMimeType && exportState.exportContent && (
            <DownloadButton
              filename={exportState.exportFilename}
              mimeType={exportState.exportMimeType}
              content={exportState.exportContent}
            />
          )}
        </form>

        <form action={dryRunAction} className="space-y-3">
          <input type="hidden" name="clientId" value={selectedClientId} />
          <div>
            <label htmlFor="dryRunConfirmClientCode" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Type client code to test first (no data removed)
            </label>
            <input
              id="dryRunConfirmClientCode"
              name="confirmClientCode"
              type="text"
              required
              autoComplete="off"
              placeholder={`e.g. ${selectedClient?.clientCode ?? "CLI-001"}`}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
            <input type="checkbox" name="allowLoanOverride" className="rounded border-gray-300 dark:border-gray-600" />
            Allow removal even if loan is still active/overdue
          </label>
          <textarea
            name="overrideReason"
            rows={2}
            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
            placeholder="Reason for allowing removal with active/overdue loan"
          />
          <ActionButton
            label="Test first (no data removed)"
            pendingLabel="Running test..."
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-60"
          />
        </form>

        <form action={deleteAction} className="space-y-3 border-t border-gray-200 dark:border-gray-700 pt-4">
          <input type="hidden" name="clientId" value={selectedClientId} />
          <div>
            <label htmlFor="confirmClientCode" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Type client code to confirm removal
            </label>
            <input
              id="confirmClientCode"
              name="confirmClientCode"
              type="text"
              required
              autoComplete="off"
              placeholder={`e.g. ${selectedClient?.clientCode ?? "CLI-001"}`}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label htmlFor="confirmPhrase" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Type DELETE CLIENT to continue
            </label>
            <input
              id="confirmPhrase"
              name="confirmPhrase"
              type="text"
              required
              autoComplete="off"
              placeholder="DELETE CLIENT"
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
            <input type="checkbox" name="ackRisk" className="rounded border-gray-300 dark:border-gray-600" required />
            I understand this is permanent and cannot be undone.
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
            <input type="checkbox" name="allowLoanOverride" className="rounded border-gray-300 dark:border-gray-600" />
            Allow removal even if loan is still active/overdue
          </label>
          <textarea
            name="overrideReason"
            rows={3}
            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
            placeholder="Reason for allowing removal with active/overdue loan"
          />
          <ActionButton
            label="Remove client permanently"
            pendingLabel="Deleting..."
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:opacity-60"
          />
        </form>
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Remove many clients</h3>
        <p className="text-xs text-gray-600 dark:text-gray-400">Each client is checked separately, so one failure will not stop the others.</p>
        <div className="max-h-56 overflow-auto rounded-lg border border-gray-200 dark:border-gray-700">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-3 py-2 text-left">Select</th>
                <th className="px-3 py-2 text-left">Client</th>
              </tr>
            </thead>
            <tbody>
              {clients.map((c) => (
                <tr key={c.id} className="border-t border-gray-100 dark:border-gray-800">
                  <td className="px-3 py-2">
                    <input
                      type="checkbox"
                      checked={bulkSelected.includes(c.id)}
                      onChange={(e) =>
                        setBulkSelected((prev) =>
                          e.target.checked ? [...prev, c.id] : prev.filter((id) => id !== c.id)
                        )
                      }
                    />
                  </td>
                  <td className="px-3 py-2">
                    {c.clientCode} — {c.name}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <form action={bulkAction} className="space-y-3">
          {bulkSelected.map((id) => (
            <input key={id} type="hidden" name="bulkClientIds" value={id} />
          ))}
          <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
            <input type="checkbox" name="allowLoanOverride" className="rounded border-gray-300 dark:border-gray-600" />
            Allow loan override for all selected clients
          </label>
          <textarea
            name="overrideReason"
            rows={2}
            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
            placeholder="Reason for loan override across selected clients"
          />
          <ActionButton
            label={`Remove selected clients (${bulkSelected.length})`}
            pendingLabel="Removing selected clients..."
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-orange-600 text-white text-sm font-medium hover:bg-orange-700 disabled:opacity-60"
          />
        </form>
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Recent removal activity</h3>
        {history.length === 0 ? (
          <p className="text-sm text-gray-600 dark:text-gray-400">No recent activity yet.</p>
        ) : (
          <div className="max-h-72 overflow-auto rounded-lg border border-gray-200 dark:border-gray-700">
            <table className="w-full text-xs sm:text-sm">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-3 py-2 text-left">Date/Time</th>
                  <th className="px-3 py-2 text-left">Activity</th>
                  <th className="px-3 py-2 text-left">Admin</th>
                  <th className="px-3 py-2 text-left">Client/User</th>
                  <th className="px-3 py-2 text-left">Details</th>
                </tr>
              </thead>
              <tbody>
                {history.map((row) => (
                  <tr key={row.id} className="border-t border-gray-100 dark:border-gray-800 align-top">
                    <td className="px-3 py-2 whitespace-nowrap">{new Date(row.createdAt).toLocaleString()}</td>
                    <td className="px-3 py-2">{row.action}</td>
                    <td className="px-3 py-2">{row.performedByName}</td>
                    <td className="px-3 py-2">
                      client:{row.targetClientId ?? "-"} user:{row.targetUserId ?? "-"}
                    </td>
                    <td className="px-3 py-2">
                      <code className="text-[11px]">{row.details ?? "-"}</code>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
