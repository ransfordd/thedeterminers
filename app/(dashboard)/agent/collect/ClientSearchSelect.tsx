"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { formatCurrencyFromGhs } from "@/lib/dashboard";
import { useCurrencyDisplay } from "@/components/dashboard/CurrencyContext";

export type CollectClientOption = {
  id: number;
  clientCode: string;
  name: string;
  dailyAmount: number;
  phone: string | null;
  depositType: string;
};

type Props = {
  clients: CollectClientOption[];
  value: string;
  onChange: (clientId: string) => void;
  inputClassName: string;
  labelClassName: string;
};

function matchesQuery(client: CollectClientOption, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const haystack = [
    client.name,
    client.clientCode,
    client.phone ?? "",
  ]
    .join(" ")
    .toLowerCase();
  return haystack.includes(q);
}

export function ClientSearchSelect({
  clients,
  value,
  onChange,
  inputClassName,
  labelClassName,
}: Props) {
  const display = useCurrencyDisplay();
  const listId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const selected = clients.find((c) => String(c.id) === value) ?? null;
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (selected) {
      setQuery(`${selected.clientCode} – ${selected.name}`);
    } else if (!value) {
      setQuery("");
    }
  }, [selected, value]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
        if (selected) {
          setQuery(`${selected.clientCode} – ${selected.name}`);
        } else {
          setQuery("");
        }
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [selected]);

  const filtered = useMemo(
    () => clients.filter((c) => matchesQuery(c, query)).slice(0, 50),
    [clients, query],
  );

  function selectClient(client: CollectClientOption) {
    onChange(String(client.id));
    setQuery(`${client.clientCode} – ${client.name}`);
    setOpen(false);
  }

  function clearSelection() {
    onChange("");
    setQuery("");
    setOpen(true);
  }

  return (
    <div ref={containerRef} className="relative">
      <label htmlFor="clientSearch" className={labelClassName}>
        Select Client <span className="text-red-500">*</span>
      </label>
      <div className="relative">
        <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm pointer-events-none" />
        <input
          id="clientSearch"
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          autoComplete="off"
          placeholder="Search by name, code, or phone..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            if (value) onChange("");
          }}
          onFocus={() => setOpen(true)}
          className={`${inputClassName} pl-9 pr-9`}
        />
        {(value || query) && (
          <button
            type="button"
            onClick={clearSelection}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            aria-label="Clear client selection"
          >
            <i className="fas fa-times text-sm" />
          </button>
        )}
      </div>
      <input type="hidden" name="clientId" value={value} required />
      {open && (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-[10px] border border-[#e1e5e9] bg-white dark:bg-gray-900 dark:border-gray-700 shadow-lg"
        >
          {filtered.length === 0 ? (
            <li className="px-3 py-2.5 text-sm text-gray-500 dark:text-gray-400">No clients match your search.</li>
          ) : (
            filtered.map((c) => {
              const isSelected = String(c.id) === value;
              const amountLabel =
                c.depositType === "flexible_amount"
                  ? "Flexible"
                  : `${formatCurrencyFromGhs(c.dailyAmount, display)}/day`;
              return (
                <li key={c.id} role="option" aria-selected={isSelected}>
                  <button
                    type="button"
                    className={`w-full text-left px-3 py-2.5 text-sm transition-colors ${
                      isSelected
                        ? "bg-[#667eea]/10 text-[#667eea]"
                        : "hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-800 dark:text-gray-200"
                    }`}
                    onClick={() => selectClient(c)}
                  >
                    <span className="font-medium block">
                      {c.clientCode} – {c.name}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {c.phone ? `${c.phone} · ` : ""}
                      {amountLabel}
                    </span>
                  </button>
                </li>
              );
            })
          )}
        </ul>
      )}
      {!value && (
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          Type to search, then select a client from the list.
        </p>
      )}
    </div>
  );
}
