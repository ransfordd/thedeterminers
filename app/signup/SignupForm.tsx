"use client";

import { useActionState, useState } from "react";
import { signupClient, type SignupState } from "@/app/actions/signup";

const REGIONS = [
  "Greater Accra", "Ashanti", "Western", "Eastern", "Volta", "Central", "Northern",
  "Upper East", "Upper West", "Brong Ahafo", "Western North", "Ahafo", "Bono", "Bono East", "Oti", "Savannah", "North East",
];

const RELATIONSHIPS = [
  { value: "spouse", label: "Spouse" },
  { value: "parent", label: "Parent" },
  { value: "sibling", label: "Sibling" },
  { value: "child", label: "Child" },
  { value: "friend", label: "Friend" },
  { value: "other", label: "Other" },
];

const inputClass =
  "login-input w-full border border-[#e1e5e9] rounded-[10px] px-4 py-2.5 focus:border-[#667eea] focus:ring-2 focus:ring-[#667eea]/20 outline-none transition-all";
const labelClass = "block text-sm font-semibold text-gray-800 mb-1.5";

export function SignupForm({
  agentOptions,
}: {
  agentOptions: { id: number; label: string }[];
}) {
  const [state, formAction] = useActionState<SignupState, FormData>(signupClient, {});
  const [depositType, setDepositType] = useState<"fixed_amount" | "flexible_amount">("fixed_amount");

  return (
    <form action={formAction} className="space-y-6">
      {state?.error && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800/50 text-red-800 dark:text-red-200 text-sm">
          <i className="fas fa-exclamation-circle flex-shrink-0" />
          <span>{state.error}</span>
        </div>
      )}

      {/* Personal */}
      <section className="space-y-4">
        <h5 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <i className="fas fa-user text-[#667eea]" /> Personal Information
        </h5>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="first_name" className={labelClass}>First Name <span className="text-red-500">*</span></label>
            <input id="first_name" name="first_name" required className={inputClass} placeholder="First name" />
          </div>
          <div>
            <label htmlFor="last_name" className={labelClass}>Last Name <span className="text-red-500">*</span></label>
            <input id="last_name" name="last_name" required className={inputClass} placeholder="Last name" />
          </div>
          <div>
            <label htmlFor="username" className={labelClass}>Username <span className="text-red-500">*</span></label>
            <input id="username" name="username" required className={inputClass} placeholder="Username" />
          </div>
          <div>
            <label htmlFor="email" className={labelClass}>Email <span className="text-red-500">*</span></label>
            <input id="email" name="email" type="email" required className={inputClass} placeholder="Email" />
          </div>
          <div>
            <label htmlFor="phone" className={labelClass}>Phone <span className="text-red-500">*</span></label>
            <input id="phone" name="phone" type="tel" required className={inputClass} placeholder="e.g. 0244444444" maxLength={15} />
          </div>
          <div>
            <label htmlFor="password" className={labelClass}>Password <span className="text-red-500">*</span></label>
            <input id="password" name="password" type="password" required minLength={8} className={inputClass} placeholder="Min 8 characters" />
          </div>
          <div>
            <label htmlFor="date_of_birth" className={labelClass}>Date of Birth</label>
            <input id="date_of_birth" name="date_of_birth" type="date" className={inputClass} />
          </div>
          <div>
            <label htmlFor="gender" className={labelClass}>Gender</label>
            <select id="gender" name="gender" className={inputClass}>
              <option value="">Select</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label htmlFor="marital_status" className={labelClass}>Marital Status</label>
            <select id="marital_status" name="marital_status" className={inputClass}>
              <option value="">Select</option>
              <option value="single">Single</option>
              <option value="married">Married</option>
              <option value="divorced">Divorced</option>
              <option value="widowed">Widowed</option>
            </select>
          </div>
          <div>
            <label htmlFor="nationality" className={labelClass}>Nationality</label>
            <select id="nationality" name="nationality" className={inputClass}>
              <option value="">Select</option>
              <option value="ghanaian">Ghanaian</option>
              <option value="nigerian">Nigerian</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>
      </section>

      {/* Address */}
      <section className="space-y-4">
        <h5 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <i className="fas fa-map-marker-alt text-[#667eea]" /> Address Information
        </h5>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label htmlFor="residential_address" className={labelClass}>Residential Address</label>
            <textarea id="residential_address" name="residential_address" rows={2} className={inputClass} placeholder="Address" />
          </div>
          <div>
            <label htmlFor="city" className={labelClass}>City</label>
            <input id="city" name="city" className={inputClass} placeholder="City" />
          </div>
          <div>
            <label htmlFor="region" className={labelClass}>Region</label>
            <select id="region" name="region" className={inputClass}>
              <option value="">Select</option>
              {REGIONS.map((r) => (
                <option key={r} value={r.toLowerCase().replace(/\s+/g, "_")}>{r}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="postal_code" className={labelClass}>Postal Code</label>
            <input id="postal_code" name="postal_code" className={inputClass} placeholder="Postal code" />
          </div>
        </div>
      </section>

      {/* Next of Kin */}
      <section className="space-y-4">
        <h5 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <i className="fas fa-users text-[#667eea]" /> Next of Kin <span className="text-red-500">*</span>
        </h5>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="next_of_kin_name" className={labelClass}>Full Name <span className="text-red-500">*</span></label>
            <input id="next_of_kin_name" name="next_of_kin_name" required className={inputClass} />
          </div>
          <div>
            <label htmlFor="next_of_kin_relationship" className={labelClass}>Relationship <span className="text-red-500">*</span></label>
            <select id="next_of_kin_relationship" name="next_of_kin_relationship" required className={inputClass}>
              <option value="">Select</option>
              {RELATIONSHIPS.map(({ value, label }) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="next_of_kin_phone" className={labelClass}>Phone <span className="text-red-500">*</span></label>
            <input id="next_of_kin_phone" name="next_of_kin_phone" type="tel" required className={inputClass} />
          </div>
          <div>
            <label htmlFor="next_of_kin_email" className={labelClass}>Email</label>
            <input id="next_of_kin_email" name="next_of_kin_email" type="email" className={inputClass} />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="next_of_kin_address" className={labelClass}>Address <span className="text-red-500">*</span></label>
            <textarea id="next_of_kin_address" name="next_of_kin_address" rows={2} required className={inputClass} />
          </div>
        </div>
      </section>

      {/* Susu */}
      <section className="space-y-4">
        <h5 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <i className="fas fa-piggy-bank text-[#667eea]" /> Susu Information
        </h5>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="agent_id" className={labelClass}>Assigned Agent <span className="text-red-500">*</span></label>
            <select id="agent_id" name="agent_id" required className={inputClass}>
              <option value="">Select Agent</option>
              {agentOptions.map((a) => (
                <option key={a.id} value={a.id}>{a.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Deposit Type <span className="text-red-500">*</span></label>
            <div className="flex flex-wrap gap-6 mt-2">
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="radio"
                  name="deposit_type"
                  value="fixed_amount"
                  checked={depositType === "fixed_amount"}
                  onChange={() => setDepositType("fixed_amount")}
                  className="signup-deposit-radio"
                />
                <span className="text-sm text-gray-800">Fixed Daily Amount</span>
              </label>
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="radio"
                  name="deposit_type"
                  value="flexible_amount"
                  checked={depositType === "flexible_amount"}
                  onChange={() => setDepositType("flexible_amount")}
                  className="signup-deposit-radio"
                />
                <span className="text-sm text-gray-800">Flexible Daily Amount</span>
              </label>
            </div>
          </div>
          {depositType === "fixed_amount" && (
            <div>
              <label htmlFor="daily_deposit_amount" className={labelClass}>Daily Deposit (GHS) <span className="text-red-500">*</span></label>
              <input
                id="daily_deposit_amount"
                name="daily_deposit_amount"
                type="number"
                step="0.01"
                min="1"
                defaultValue="20"
                required={depositType === "fixed_amount"}
                className={inputClass}
              />
            </div>
          )}
        </div>
        {depositType === "flexible_amount" && (
          <p className="text-sm text-gray-600 dark:text-gray-400 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
            <i className="fas fa-info-circle text-[#667eea] mr-2" />
            Flexible: you can deposit any amount each day (min GHS 10). Commission = Total Amount ÷ Total Days.
          </p>
        )}
      </section>

      <div className="pt-2">
        <button
          type="submit"
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-[#667eea] hover:bg-[#5568d3] text-white font-semibold py-3.5 px-8 rounded-xl transition-colors"
        >
          <i className="fas fa-user-plus" /> Create Account
        </button>
      </div>
    </form>
  );
}
