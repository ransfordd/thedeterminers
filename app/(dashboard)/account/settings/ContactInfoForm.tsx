"use client";

import { useActionState } from "react";
import { updateContactInfo, type ContactInfoState } from "@/app/actions/account";

const initialState: ContactInfoState = {};

const REGIONS = [
  "greater_accra", "ashanti", "western", "eastern", "volta", "central",
  "northern", "upper_east", "upper_west", "western_north", "ahafo", "bono",
  "bono_east", "oti", "savannah", "north_east",
];

type Props = {
  postalAddress: string | null;
  city: string | null;
  region: string | null;
  postalCode: string | null;
};

export function ContactInfoForm({ postalAddress, city, region, postalCode }: Props) {
  const [state, formAction] = useActionState(updateContactInfo, initialState);

  return (
    <form action={formAction} className="space-y-4 max-w-xl">
      {state?.error && (
        <p className="text-sm text-red-600 dark:text-red-400">{state.error}</p>
      )}
      {state?.success && (
        <p className="text-sm text-green-600 dark:text-green-400">Saved.</p>
      )}
      <div>
        <label htmlFor="postalAddress" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Postal address
        </label>
        <textarea
          id="postalAddress"
          name="postalAddress"
          rows={2}
          defaultValue={postalAddress ?? ""}
          className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
        />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="city" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            City
          </label>
          <input
            id="city"
            name="city"
            type="text"
            defaultValue={city ?? ""}
            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label htmlFor="region" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Region
          </label>
          <select
            id="region"
            name="region"
            defaultValue={region ?? ""}
            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
          >
            <option value="">Select</option>
            {REGIONS.map((r) => (
              <option key={r} value={r}>
                {r.replace(/_/g, " ")}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label htmlFor="postalCode" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Postal code
        </label>
        <input
          id="postalCode"
          name="postalCode"
          type="text"
          defaultValue={postalCode ?? ""}
          className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm max-w-[140px]"
        />
      </div>
      <button
        type="submit"
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700"
      >
        <i className="fas fa-save" /> Update contact information
      </button>
    </form>
  );
}
