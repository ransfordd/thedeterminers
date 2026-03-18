"use client";

import { createContext, useContext } from "react";
import type { CurrencyDisplayOpts } from "@/lib/dashboard/utils";

const defaultDisplay: CurrencyDisplayOpts = { code: "GHS", rateFromGhs: 1 };

const CurrencyContext = createContext<CurrencyDisplayOpts>(defaultDisplay);

export function CurrencyProvider({
  value,
  children,
}: {
  value: CurrencyDisplayOpts;
  children: React.ReactNode;
}) {
  return (
    <CurrencyContext.Provider value={value?.code ? value : defaultDisplay}>
      {children}
    </CurrencyContext.Provider>
  );
}

/** Display currency + GHS→display rate (for formatCurrencyFromGhs). */
export function useCurrencyDisplay(): CurrencyDisplayOpts {
  return useContext(CurrencyContext);
}
