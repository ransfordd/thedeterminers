"use client";

type ClientDetail = {
  id: number;
  clientCode: string;
  name: string;
  phone: string | null;
  email: string | null;
  dailyAmount: number;
  depositType: string;
  agentCode: string;
};

export function ClientInformationCard({
  selectedClientId,
  clients,
}: {
  selectedClientId: number | null;
  clients: ClientDetail[];
}) {
  const client = selectedClientId
    ? clients.find((c) => c.id === selectedClientId)
    : null;

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm overflow-hidden">
      <div className="bg-gradient-to-r from-gray-50 to-gray-100/80 dark:from-gray-800 dark:to-gray-800/80 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
            <i className="fas fa-user-circle text-lg" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white text-sm">Client Information</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">Selected client details</p>
          </div>
        </div>
      </div>
      <div className="p-4 min-h-[140px]">
        {!client ? (
          <div className="text-center py-6 text-gray-500 dark:text-gray-400">
            <div className="mb-3 opacity-50">
              <i className="fas fa-user text-4xl text-gray-300 dark:text-gray-600" />
            </div>
            <p className="font-semibold text-gray-600 dark:text-gray-300 text-sm">No Client Selected</p>
            <p className="text-xs mt-1 dark:text-gray-400">Select a client from the form to view their details</p>
          </div>
        ) : (
          <div className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
            <p className="font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
              <i className="fas fa-user w-4" /> {client.name}
            </p>
            <p><span className="text-gray-500 dark:text-gray-400">Client Code:</span> {client.clientCode}</p>
            {client.phone && (
              <p><span className="text-gray-500 dark:text-gray-400">Phone:</span> {client.phone}</p>
            )}
            {client.email && (
              <p><span className="text-gray-500 dark:text-gray-400">Email:</span> {client.email}</p>
            )}
            {client.depositType === "flexible_amount" ? (
              <>
                <p className="font-medium dark:text-gray-300">Deposit Type: Flexible Amount</p>
                <p className="text-gray-600 dark:text-gray-400">Minimum: GHS 10.00</p>
              </>
            ) : (
              <p><span className="text-gray-500 dark:text-gray-400">Daily Amount:</span> GHS {client.dailyAmount.toFixed(2)}</p>
            )}
            <p><span className="text-gray-500 dark:text-gray-400">Assigned Agent:</span> {client.agentCode}</p>
          </div>
        )}
      </div>
    </div>
  );
}
