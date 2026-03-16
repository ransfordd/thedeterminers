"use client";

import { useActionState } from "react";
import { updateClient, type UpdateClientState } from "@/app/actions/clients";

const initialState: UpdateClientState = {};

const REGIONS = [
  "greater_accra", "ashanti", "western", "eastern", "volta", "central",
  "northern", "upper_east", "upper_west", "western_north", "ahafo", "bono",
  "bono_east", "oti", "savannah", "north_east",
];

type AgentOption = { id: number; agentCode: string; firstName: string; lastName: string };

type DefaultValue = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  middleName: string;
  dateOfBirth: string;
  gender: string;
  maritalStatus: string;
  nationality: string;
  postalAddress: string;
  city: string;
  region: string;
  postalCode: string;
  nextOfKinName: string;
  nextOfKinRelationship: string;
  nextOfKinPhone: string;
  nextOfKinEmail: string;
  nextOfKinAddress: string;
    agentId: number | "";
  dailyDepositAmount: number;
  depositType: string;
  preferredCollectionTime: string;
};

type Props = {
  clientId: number;
  defaultValue: DefaultValue;
  agents: AgentOption[];
  returnTo: string;
};

const inputClass = "w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2";
const labelClass = "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1";

export function EditClientForm({ clientId, defaultValue, agents, returnTo }: Props) {
  const [state, formAction] = useActionState(updateClient, initialState);
  const d = defaultValue;

  return (
    <form action={formAction} className="space-y-8 max-w-2xl">
      <input type="hidden" name="clientId" value={clientId} />
      {state?.error && (
        <div className="rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 text-sm">
          {state.error}
        </div>
      )}
      {state?.success && (
        <div className="rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300 px-4 py-3 text-sm">
          Client updated. <a href={returnTo} className="font-medium underline">Back to list</a>
        </div>
      )}

      {/* Profile — same as client account settings */}
      <section className="space-y-4">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 border-b border-gray-200 dark:border-gray-700 pb-2">Profile</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="firstName" className={labelClass}>First Name <span className="text-red-500">*</span></label>
            <input id="firstName" name="firstName" type="text" required defaultValue={d.firstName} className={inputClass} />
          </div>
          <div>
            <label htmlFor="lastName" className={labelClass}>Last Name <span className="text-red-500">*</span></label>
            <input id="lastName" name="lastName" type="text" required defaultValue={d.lastName} className={inputClass} />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="email" className={labelClass}>Email <span className="text-red-500">*</span></label>
            <input id="email" name="email" type="email" required defaultValue={d.email} className={inputClass} />
          </div>
          <div>
            <label htmlFor="phone" className={labelClass}>Phone</label>
            <input id="phone" name="phone" type="tel" defaultValue={d.phone} className={inputClass} />
          </div>
        </div>
        <div>
          <label htmlFor="address" className={labelClass}>Address</label>
          <textarea id="address" name="address" rows={2} defaultValue={d.address} className={inputClass} />
        </div>
      </section>

      {/* Personal information */}
      <section className="space-y-4">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 border-b border-gray-200 dark:border-gray-700 pb-2">Personal information</h3>
        <div>
          <label htmlFor="middleName" className={labelClass}>Middle name</label>
          <input id="middleName" name="middleName" type="text" defaultValue={d.middleName} className={inputClass} />
        </div>
        <div>
          <label htmlFor="dateOfBirth" className={labelClass}>Date of birth</label>
          <input id="dateOfBirth" name="dateOfBirth" type="date" defaultValue={d.dateOfBirth} className={inputClass} />
        </div>
        <div>
          <label htmlFor="gender" className={labelClass}>Gender</label>
          <select id="gender" name="gender" defaultValue={d.gender} className={inputClass}>
            <option value="">Select</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div>
          <label htmlFor="maritalStatus" className={labelClass}>Marital status</label>
          <select id="maritalStatus" name="maritalStatus" defaultValue={d.maritalStatus} className={inputClass}>
            <option value="">Select</option>
            <option value="single">Single</option>
            <option value="married">Married</option>
            <option value="divorced">Divorced</option>
            <option value="widowed">Widowed</option>
          </select>
        </div>
        <div>
          <label htmlFor="nationality" className={labelClass}>Nationality</label>
          <select id="nationality" name="nationality" defaultValue={d.nationality} className={inputClass}>
            <option value="">Select</option>
            <option value="ghanaian">Ghanaian</option>
            <option value="nigerian">Nigerian</option>
            <option value="togolese">Togolese</option>
            <option value="other">Other</option>
          </select>
        </div>
      </section>

      {/* Contact information */}
      <section className="space-y-4">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 border-b border-gray-200 dark:border-gray-700 pb-2">Contact information</h3>
        <div>
          <label htmlFor="postalAddress" className={labelClass}>Postal address</label>
          <textarea id="postalAddress" name="postalAddress" rows={2} defaultValue={d.postalAddress} className={inputClass} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="city" className={labelClass}>City</label>
            <input id="city" name="city" type="text" defaultValue={d.city} className={inputClass} />
          </div>
          <div>
            <label htmlFor="region" className={labelClass}>Region</label>
            <select id="region" name="region" defaultValue={d.region} className={inputClass}>
              <option value="">Select</option>
              {REGIONS.map((r) => (
                <option key={r} value={r}>{r.replace(/_/g, " ")}</option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label htmlFor="postalCode" className={labelClass}>Postal code</label>
          <input id="postalCode" name="postalCode" type="text" defaultValue={d.postalCode} className={inputClass + " max-w-[140px]"} />
        </div>
      </section>

      {/* Next of kin */}
      <section className="space-y-4">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 border-b border-gray-200 dark:border-gray-700 pb-2">Next of kin</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="nextOfKinName" className={labelClass}>Next of kin full name</label>
            <input id="nextOfKinName" name="nextOfKinName" type="text" defaultValue={d.nextOfKinName} className={inputClass} />
          </div>
          <div>
            <label htmlFor="nextOfKinRelationship" className={labelClass}>Relationship</label>
            <select id="nextOfKinRelationship" name="nextOfKinRelationship" defaultValue={d.nextOfKinRelationship} className={inputClass}>
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
            <label htmlFor="nextOfKinPhone" className={labelClass}>Next of kin phone</label>
            <input id="nextOfKinPhone" name="nextOfKinPhone" type="tel" defaultValue={d.nextOfKinPhone} className={inputClass} />
          </div>
          <div>
            <label htmlFor="nextOfKinEmail" className={labelClass}>Next of kin email</label>
            <input id="nextOfKinEmail" name="nextOfKinEmail" type="email" defaultValue={d.nextOfKinEmail} className={inputClass} />
          </div>
        </div>
        <div>
          <label htmlFor="nextOfKinAddress" className={labelClass}>Next of kin address</label>
          <textarea id="nextOfKinAddress" name="nextOfKinAddress" rows={3} defaultValue={d.nextOfKinAddress} className={inputClass} />
        </div>
      </section>

      {/* Admin-only: assignment and deposit settings */}
      <section className="space-y-4">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 border-b border-gray-200 dark:border-gray-700 pb-2">Assignment & deposit (admin only)</h3>
        <div>
          <label htmlFor="agentId" className={labelClass}>Assigned Agent</label>
          <select id="agentId" name="agentId" defaultValue={d.agentId} className={inputClass}>
            <option value="">Unassigned</option>
            {agents.map((a) => (
              <option key={a.id} value={a.id}>{a.agentCode} – {a.firstName} {a.lastName}</option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Deposit Type <span className="text-red-500">*</span></label>
            <div className="flex gap-4 pt-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="depositType" value="fixed_amount" defaultChecked={d.depositType === "fixed_amount"} className="rounded" />
                <span className="text-sm">Fixed daily amount</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="depositType" value="flexible_amount" defaultChecked={d.depositType === "flexible_amount"} className="rounded" />
                <span className="text-sm">Flexible daily amount</span>
              </label>
            </div>
          </div>
          <div>
            <label htmlFor="dailyDepositAmount" className={labelClass}>Daily Deposit Amount (GHS) <span className="text-red-500">*</span></label>
            <input id="dailyDepositAmount" name="dailyDepositAmount" type="number" step="0.01" min="0" required defaultValue={d.dailyDepositAmount} className={inputClass} />
          </div>
        </div>
        <div>
          <label htmlFor="preferredCollectionTime" className={labelClass}>Preferred Collection Time</label>
          <input id="preferredCollectionTime" name="preferredCollectionTime" type="text" placeholder="e.g. 09:00" defaultValue={d.preferredCollectionTime} className={inputClass} />
        </div>
        <div>
          <label htmlFor="password" className={labelClass}>New Password (leave blank to keep current)</label>
          <input id="password" name="password" type="password" minLength={6} placeholder="Optional" className={inputClass} />
        </div>
      </section>

      <div className="flex gap-3 pt-2">
        <a href={returnTo} className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">Cancel</a>
        <button type="submit" className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium">Update Client</button>
      </div>
    </form>
  );
}
