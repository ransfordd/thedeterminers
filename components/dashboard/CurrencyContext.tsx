"use client";

import { createContext, useContext } from "react";

const CurrencyContext = createContext<string>("GHS");

export function CurrencyProvider({
  currency,
  children,
}: {
  currency: string;
  children: React.ReactNode;
}) {
  return (
    <CurrencyContext.Provider value={currency || "GHS"}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency(): string {
  return useContext(CurrencyContext);
}
