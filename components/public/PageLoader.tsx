"use client";

import { useState, useEffect } from "react";
import type { BusinessInfo } from "@/lib/public-business";

export function PageLoader({ businessInfo }: { businessInfo: BusinessInfo }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const hide = () => setVisible(false);
    if (document.readyState === "complete") {
      hide();
    } else {
      window.addEventListener("load", hide);
      return () => window.removeEventListener("load", hide);
    }
  }, []);

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-indigo-600 text-white transition-opacity duration-500"
      aria-live="polite"
      aria-label="Loading"
    >
      <div className="flex flex-col items-center">
        <div className="flex items-center gap-4 mb-8">
          <i className="fas fa-coins text-5xl animate-pulse" aria-hidden />
          <span className="text-2xl font-bold">{businessInfo.name}</span>
        </div>
        <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin mb-6" />
        <p className="text-lg font-medium text-white/90">
          Loading your financial future...
        </p>
      </div>
    </div>
  );
}
