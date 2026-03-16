"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export function ThemeToggle() {
  const { setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <span className="flex-shrink-0 w-9 h-9 rounded-lg bg-gray-100 dark:bg-white/10 flex items-center justify-center" aria-hidden />
    );
  }

  const isDark = resolvedTheme === "dark";

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 text-gray-700 dark:text-white"
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Light mode" : "Dark mode"}
    >
      {isDark ? (
        <i className="fas fa-sun text-lg" aria-hidden />
      ) : (
        <i className="fas fa-moon text-lg" aria-hidden />
      )}
    </button>
  );
}
