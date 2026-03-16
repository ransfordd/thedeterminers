"use client";

import { useActionState } from "react";
import { updateAgent, type UpdateAgentState } from "@/app/actions/agents";
import { reassignClientForm, type ReassignClientState, unassignClientForm, type UnassignClientState } from "@/app/actions/clients";

const initialState: UpdateAgentState = {};

const REGIONS = [
  "greater_accra", "ashanti", "western", "eastern", "volta", "central",
  "northern", "upper_east", "upper_west", "western_north", "ahafo", "bono",
  "bono_east", "oti", "savannah", "north_east",
];

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
  commissionRate: number;
};

type ClientCard = {
  id: number;
  clientCode: string;
  displayName: string;
  email: string;
  phone: string;
  dailyDepositAmount: number;
};
type AgentOption = { id: number; agentCode: string; displayName: string };

type Props = {
  agentId: number;
  defaultValue: DefaultValue;
  assignedClients: ClientCard[];
  availableClients: ClientCard[];
  agents: AgentOption[];
  canReassign: boolean;
  returnTo: string;
};

const inputClass = "w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2";
const labelClass = "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1";

function AssignedClientCard({
  client,
  agents,
  currentAgentId,
}: {
  client: ClientCard;
  agents: AgentOption[];
  currentAgentId: number;
}) {
  const [reassignState, reassignFormAction] = useActionState(reassignClientForm, {} as ReassignClientState);
  const [unassignState, unassignFormAction] = useActionState(unassignClientForm, {} as UnassignClientState);
  const otherAgents = agents.filter((a) => a.id !== currentAgentId);
  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 p-4 shadow-sm">
      {/* Header row: client name, client ID, agent dropdown, Reassign, Remove */}
      <div className="flex flex-wrap items-center gap-3 mb-3">
        <span className="font-semibold text-gray-900 dark:text-gray-100">{client.displayName}</span>
        <span className="inline-flex items-center rounded-full bg-indigo-100 dark:bg-indigo-900/40 px-2.5 py-0.5 text-xs font-medium text-indigo-800 dark:text-indigo-200">
          {client.clientCode}
        </span>
        <form action={reassignFormAction} className="flex flex-wrap items-center gap-2 ml-auto">
          <input type="hidden" name="clientId" value={client.id} />
          <select
            name="newAgentId"
            className={inputClass + " max-w-[220px] text-sm py-1.5"}
            required
            defaultValue={currentAgentId}
          >
            {agents.map((a) => (
              <option key={a.id} value={a.id}>{a.agentCode} - {a.displayName}</option>
            ))}
          </select>
          {otherAgents.length > 0 && (
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 rounded-lg bg-gray-600 hover:bg-gray-700 px-3 py-1.5 text-sm font-medium text-white"
            >
              Reassign
            </button>
          )}
        </form>
        <form action={unassignFormAction}>
          <input type="hidden" name="clientId" value={client.id} />
          <button
            type="submit"
            className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 hover:bg-red-700 px-3 py-1.5 text-sm font-medium text-white"
          >
            <i className="fas fa-times" aria-hidden /> Remove
          </button>
        </form>
        {reassignState?.success && <span className="text-xs text-green-600 dark:text-green-400">Reassigned.</span>}
        {reassignState?.error && <span className="text-xs text-red-600 dark:text-red-400">{reassignState.error}</span>}
        {unassignState?.success && <span className="text-xs text-green-600 dark:text-green-400">Removed.</span>}
        {unassignState?.error && <span className="text-xs text-red-600 dark:text-red-400">{unassignState.error}</span>}
      </div>
      {/* Contact / financial details */}
      <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
        <p className="flex items-center gap-2">
          <i className="fas fa-envelope w-4 text-gray-400" aria-hidden />
          {client.email}
        </p>
        {client.phone ? (
          <p className="flex items-center gap-2">
            <i className="fas fa-phone w-4 text-gray-400" aria-hidden />
            {client.phone}
          </p>
        ) : null}
        <p className="flex items-center gap-2">
          <i className="fas fa-sack-dollar w-4 text-gray-400" aria-hidden />
          GHS {client.dailyDepositAmount.toFixed(2)}/day
        </p>
      </div>
    </div>
  );
}

function AvailableClientCard({ client, assignAgentId }: { client: ClientCard; assignAgentId: number }) {
  const [state, formAction] = useActionState(reassignClientForm, {} as ReassignClientState);
  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 p-4 shadow-sm">
      {/* Name on first line */}
      <p className="font-semibold text-gray-900 dark:text-gray-100 mb-0.5">{client.displayName}</p>
      {/* Client ID on second line */}
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">{client.clientCode}</p>
      {/* Assign button */}
      <form action={formAction} className="mb-3">
        <input type="hidden" name="clientId" value={client.id} />
        <input type="hidden" name="newAgentId" value={assignAgentId} />
        <button
          type="submit"
          className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 px-3 py-1.5 text-sm font-medium text-white"
        >
          <i className="fas fa-plus" aria-hidden /> Assign
        </button>
        {state?.success && <span className="ml-2 text-xs text-green-600 dark:text-green-400">Assigned.</span>}
        {state?.error && <span className="ml-2 text-xs text-red-600 dark:text-red-400">{state.error}</span>}
      </form>
      {/* Contact / financial details */}
      <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
        <p className="flex items-center gap-2">
          <i className="fas fa-envelope w-4 text-gray-400" aria-hidden />
          {client.email}
        </p>
        {client.phone ? (
          <p className="flex items-center gap-2">
            <i className="fas fa-phone w-4 text-gray-400" aria-hidden />
            {client.phone}
          </p>
        ) : null}
        <p className="flex items-center gap-2">
          <i className="fas fa-sack-dollar w-4 text-gray-400" aria-hidden />
          GHS {client.dailyDepositAmount.toFixed(2)}/day
        </p>
      </div>
    </div>
  );
}

export function EditAgentForm({ agentId, defaultValue, assignedClients, availableClients, agents, canReassign, returnTo }: Props) {
  const [state, formAction] = useActionState(updateAgent, initialState);
  const d = defaultValue;

  return (
    <div className="space-y-8 max-w-2xl">
      <form action={formAction} className="space-y-8">
        <input type="hidden" name="agentId" value={agentId} />
        {state?.error && (
          <div className="rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 text-sm">
            {state.error}
          </div>
        )}
        {state?.success && (
          <div className="rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300 px-4 py-3 text-sm">
            Agent updated. <a href={returnTo} className="font-medium underline">Back to list</a>
          </div>
        )}

        {/* Profile */}
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

        {/* Commission (admin only) */}
        <section className="space-y-4">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 border-b border-gray-200 dark:border-gray-700 pb-2">Commission</h3>
          <div>
            <label htmlFor="commissionRate" className={labelClass}>Commission Rate (%) <span className="text-red-500">*</span></label>
            <input id="commissionRate" name="commissionRate" type="number" step="0.1" min="0" max="100" required defaultValue={d.commissionRate} className={inputClass} />
          </div>
        </section>

        {/* Password */}
        <section className="space-y-4">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 border-b border-gray-200 dark:border-gray-700 pb-2">Password</h3>
          <div>
            <label htmlFor="password" className={labelClass}>New Password (leave blank to keep current)</label>
            <input id="password" name="password" type="password" minLength={6} placeholder="Optional" className={inputClass} />
          </div>
        </section>

        <div className="flex gap-3 pt-2">
          <a href={returnTo} className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">Cancel</a>
          <button type="submit" className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium">Update Agent</button>
        </div>
      </form>

      {/* Client reassignment (admin only) — Assigned / Available panels */}
      {canReassign && (
        <section className="pt-6 border-t border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 border-b border-gray-200 dark:border-gray-700 pb-2 mb-4">Client reassignment (admin only)</h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left: Assigned Clients */}
            <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/30 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                <div className="flex items-center gap-2">
                  <i className="fas fa-users text-indigo-600 dark:text-indigo-400" aria-hidden />
                  <h4 className="font-semibold text-gray-900 dark:text-gray-100">Assigned Clients</h4>
                </div>
                <span className="inline-flex items-center rounded-full bg-indigo-100 dark:bg-indigo-900/40 px-2.5 py-0.5 text-xs font-medium text-indigo-800 dark:text-indigo-200">
                  {assignedClients.length} client{assignedClients.length !== 1 ? "s" : ""}
                </span>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Clients currently assigned to this agent</p>
              <div className="space-y-3">
                {assignedClients.length === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400 py-4">No clients assigned.</p>
                ) : (
                  assignedClients.map((client) => (
                    <AssignedClientCard key={client.id} client={client} agents={agents} currentAgentId={agentId} />
                  ))
                )}
              </div>
            </div>

            {/* Right: Available Clients */}
            <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/30 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                <div className="flex items-center gap-2">
                  <i className="fas fa-user-plus text-gray-500 dark:text-gray-400" aria-hidden />
                  <h4 className="font-semibold text-gray-900 dark:text-gray-100">Available Clients</h4>
                </div>
                <span className="inline-flex items-center rounded-full bg-gray-200 dark:bg-gray-700 px-2.5 py-0.5 text-xs font-medium text-gray-700 dark:text-gray-300">
                  {availableClients.length} available
                </span>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Clients that can be assigned to this agent</p>
              {availableClients.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <i className="fas fa-user-plus text-4xl text-gray-300 dark:text-gray-600 mb-3" aria-hidden />
                  <p className="font-medium text-gray-700 dark:text-gray-300">No Available Clients</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">All clients are already assigned to agents.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {availableClients.map((client) => (
                    <AvailableClientCard key={client.id} client={client} assignAgentId={agentId} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
