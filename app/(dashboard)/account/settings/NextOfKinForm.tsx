"use client";

import { useActionState } from "react";
import { updateNextOfKin, type NextOfKinState } from "@/app/actions/account";

const initialState: NextOfKinState = {};

type Props = {
  nextOfKinName: string | null;
  nextOfKinRelationship: string | null;
  nextOfKinPhone: string | null;
  nextOfKinEmail: string | null;
  nextOfKinAddress: string | null;
};

export function NextOfKinForm({
  nextOfKinName,
  nextOfKinRelationship,
  nextOfKinPhone,
  nextOfKinEmail,
  nextOfKinAddress,
}: Props) {
  const [state, formAction] = useActionState(updateNextOfKin, initialState);

  return (
    <form action={formAction} className="space-y-4 max-w-xl">
      {state?.error && (
        <p className="text-sm text-red-600 dark:text-red-400">{state.error}</p>
      )}
      {state?.success && (
        <p className="text-sm text-green-600 dark:text-green-400">Saved.</p>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="nextOfKinName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Next of kin full name
          </label>
          <input
            id="nextOfKinName"
            name="nextOfKinName"
            type="text"
            defaultValue={nextOfKinName ?? ""}
            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label htmlFor="nextOfKinRelationship" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Relationship
          </label>
          <select
            id="nextOfKinRelationship"
            name="nextOfKinRelationship"
            defaultValue={nextOfKinRelationship ?? ""}
            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
          >
            <option value="">Select</option>
            <option value="spouse">Spouse</option>
            <option value="parent">Parent</option>
            <option value="sibling">Sibling</option>
            <option value="child">Child</option>
            <option value="friend">Friend</option>
            <option value="other">Other</option>
          </select>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="nextOfKinPhone" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Next of kin phone
          </label>
          <input
            id="nextOfKinPhone"
            name="nextOfKinPhone"
            type="tel"
            defaultValue={nextOfKinPhone ?? ""}
            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label htmlFor="nextOfKinEmail" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Next of kin email
          </label>
          <input
            id="nextOfKinEmail"
            name="nextOfKinEmail"
            type="email"
            defaultValue={nextOfKinEmail ?? ""}
            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
          />
        </div>
      </div>
      <div>
        <label htmlFor="nextOfKinAddress" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Next of kin address
        </label>
        <textarea
          id="nextOfKinAddress"
          name="nextOfKinAddress"
          rows={3}
          defaultValue={nextOfKinAddress ?? ""}
          className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
        />
      </div>
      <button
        type="submit"
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700"
      >
        <i className="fas fa-save" /> Update next of kin
      </button>
    </form>
  );
}
