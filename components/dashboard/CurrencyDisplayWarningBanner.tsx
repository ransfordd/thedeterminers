import Link from "next/link";

type Props = {
  code: string;
  rateFromGhs: number;
  canManageSettings: boolean;
};

/**
 * Shown when display currency is not GHS but the conversion rate is still 1 (no real conversion).
 */
export function CurrencyDisplayWarningBanner({ code, rateFromGhs, canManageSettings }: Props) {
  if (code === "GHS" || rateFromGhs !== 1) return null;

  return (
    <div
      className="border-b border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/50 px-4 py-2.5 text-sm text-amber-950 dark:text-amber-100"
      role="status"
    >
      <p className="font-medium">Display currency ({code}) has no valid rate configured</p>
      <p className="mt-1 text-amber-900/90 dark:text-amber-200/90">
        All amounts are stored in <strong>GHS</strong>. Numbers are shown 1:1 with the {code} label until a rate is set.
        {canManageSettings ? (
          <>
            {" "}
            In{" "}
            <Link href="/admin/settings" className="underline font-medium hover:no-underline">
              System Configuration
            </Link>
            , set and save{" "}
            <strong>{code === "USD" ? "USD per 1 GHS" : "EUR per 1 GHS"}</strong> (positive, not 1—e.g.{" "}
            <code className="text-xs bg-amber-100 dark:bg-amber-900/50 px-1 rounded">
              {code === "USD" ? "0.0916" : "0.055"}
            </code>
            ).
          </>
        ) : (
          <> Contact your administrator to set the USD/EUR display rate in System Configuration.</>
        )}
      </p>
    </div>
  );
}
