import { getMaintenanceStatus } from "@/lib/system-settings";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function MaintenancePage() {
  const { message } = await getMaintenanceStatus();
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-900 px-4">
      <div className="max-w-md w-full text-center">
        <div className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/40">
          <i className="fas fa-tools text-3xl text-amber-600 dark:text-amber-400" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Under Maintenance
        </h1>
        <p className="text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
          {message || "We are currently performing scheduled maintenance. Please try again later."}
        </p>
        <p className="mt-6 text-sm text-gray-500 dark:text-gray-500">
          Thank you for your patience.
        </p>
      </div>
    </div>
  );
}
