"use client";

import { useState } from "react";
import type { LoginAccountOption } from "@/lib/login-phone";

type Props = {
  accounts: LoginAccountOption[];
  selectedUserId: number | null;
  onSelect: (id: number) => void;
};

function accountInitials(firstName: string, lastName: string): string {
  const first = firstName.trim()[0]?.toUpperCase() ?? "";
  const last = lastName.trim()[0]?.toUpperCase() ?? "";
  return first + last || "?";
}

function formatUsername(username: string): string {
  return username.trim().replace(/\s+/g, "");
}

function AccountAvatar({ account }: { account: LoginAccountOption }) {
  const [imgFailed, setImgFailed] = useState(false);
  const initials = accountInitials(account.firstName, account.lastName);
  const name = `${account.firstName} ${account.lastName}`.trim();

  if (account.profileImage && !imgFailed) {
    return (
      <img
        src={account.profileImage}
        alt={name}
        className="h-11 w-11 shrink-0 rounded-full border border-[#667eea]/20 object-cover"
        onError={() => setImgFailed(true)}
      />
    );
  }

  return (
    <span
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#667eea]/20 to-[#667eea]/10 text-sm font-semibold text-[#667eea]"
      aria-hidden
    >
      {initials}
    </span>
  );
}

export function LoginAccountPicker({ accounts, selectedUserId, onSelect }: Props) {
  const count = accounts.length;
  const accountLabel = count === 1 ? "account" : "accounts";

  return (
    <div
      className="scroll-mt-4 rounded-2xl border border-[#667eea]/20 bg-gradient-to-b from-[#667eea]/5 to-white p-4 shadow-sm"
      role="radiogroup"
      aria-label="Choose your account"
    >
      <div className="mb-4 flex items-start gap-3">
        <span
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#667eea]/10 text-[#667eea]"
          aria-hidden
        >
          <i className="fas fa-users text-lg" />
        </span>
        <div>
          <p className="font-semibold text-gray-900">Choose your account</p>
          <p className="text-sm text-gray-500">
            {count} {accountLabel} use this phone number
          </p>
        </div>
      </div>

      <ul className="space-y-2">
        {accounts.map((account) => {
          const name = `${account.firstName} ${account.lastName}`.trim();
          const checked = selectedUserId === account.id;
          const username = formatUsername(account.username);

          return (
            <li key={account.id}>
              <label
                className={`login-account-option group flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition-all ${
                  checked
                    ? "border-[#667eea] bg-[#667eea]/[0.08] shadow-sm ring-2 ring-[#667eea]/20"
                    : "border-gray-200 hover:border-[#667eea]/50 hover:shadow-sm"
                }`}
              >
                <input
                  type="radio"
                  name="loginAccount"
                  value={account.id}
                  checked={checked}
                  onChange={() => onSelect(account.id)}
                  className="sr-only"
                />
                <AccountAvatar account={account} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold text-gray-900">{name}</span>
                  <span className="block truncate text-sm text-gray-500">@{username}</span>
                </span>
                <span className="login-account-check shrink-0" aria-hidden />
              </label>
            </li>
          );
        })}
      </ul>

      <p className="mt-3 text-xs text-gray-500">Each account has its own password.</p>
    </div>
  );
}
