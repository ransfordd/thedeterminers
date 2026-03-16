"use client";

import { useActionState } from "react";
import { updatePersonalInfo, type PersonalInfoState } from "@/app/actions/account";

const initialState: PersonalInfoState = {};

type Props = {
  middleName: string | null;
  dateOfBirth: string | null;
  gender: string | null;
  maritalStatus: string | null;
  nationality: string | null;
};

export function PersonalInfoForm({
  middleName,
  dateOfBirth,
  gender,
  maritalStatus,
  nationality,
}: Props) {
  const [state, formAction] = useActionState(updatePersonalInfo, initialState);
  const dob = dateOfBirth
    ? (typeof dateOfBirth === "string" ? dateOfBirth : new Date(dateOfBirth).toISOString().slice(0, 10))
    : "";

  return (
    <form action={formAction} className="space-y-4 max-w-xl">
      {state?.error && (
        <p className="text-sm text-red-600 dark:text-red-400">{state.error}</p>
      )}
      {state?.success && (
        <p className="text-sm text-green-600 dark:text-green-400">Saved.</p>
      )}
      <div>
        <label htmlFor="middleName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Middle name
        </label>
        <input
          id="middleName"
          name="middleName"
          type="text"
          defaultValue={middleName ?? ""}
          className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label htmlFor="dateOfBirth" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Date of birth
        </label>
        <input
          id="dateOfBirth"
          name="dateOfBirth"
          type="date"
          defaultValue={dob}
          className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label htmlFor="gender" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Gender
        </label>
        <select
          id="gender"
          name="gender"
          defaultValue={gender ?? ""}
          className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
        >
          <option value="">Select</option>
          <option value="male">Male</option>
          <option value="female">Female</option>
          <option value="other">Other</option>
        </select>
      </div>
      <div>
        <label htmlFor="maritalStatus" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Marital status
        </label>
        <select
          id="maritalStatus"
          name="maritalStatus"
          defaultValue={maritalStatus ?? ""}
          className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
        >
          <option value="">Select</option>
          <option value="single">Single</option>
          <option value="married">Married</option>
          <option value="divorced">Divorced</option>
          <option value="widowed">Widowed</option>
        </select>
      </div>
      <div>
        <label htmlFor="nationality" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Nationality
        </label>
        <select
          id="nationality"
          name="nationality"
          defaultValue={nationality ?? ""}
          className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
        >
          <option value="">Select</option>
          <option value="ghanaian">Ghanaian</option>
          <option value="nigerian">Nigerian</option>
          <option value="togolese">Togolese</option>
          <option value="other">Other</option>
        </select>
      </div>
      <button
        type="submit"
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700"
      >
        <i className="fas fa-save" /> Update personal information
      </button>
    </form>
  );
}
