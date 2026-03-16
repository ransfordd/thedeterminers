"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { businessInfo } from "@/lib/public-business";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/services", label: "Services" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
  { href: "/news", label: "News" },
];

export function PublicHeader() {
  const pathname = usePathname();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <>
      <header className="fixed top-10 left-0 right-0 z-[1000] px-4 sm:px-6">
        <div className="max-w-6xl mx-auto bg-white rounded-xl shadow-lg border border-gray-100 py-3 px-4 sm:px-6 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-3 text-blue-600 no-underline"
          >
            <i className="fas fa-coins text-2xl" aria-hidden />
            <div>
              <div className="text-lg font-bold leading-tight text-blue-600">
                {businessInfo.name}
              </div>
              <div className="text-[10px] sm:text-xs text-gray-500 font-normal uppercase tracking-wide">
                Digital Banking System
              </div>
            </div>
          </Link>
          <nav className="hidden md:flex items-center gap-6">
            {navLinks.map(({ href, label }) => {
              const isActive = pathname === href || (href !== "/" && pathname.startsWith(href));
              return (
                <Link
                  key={href}
                  href={href}
                  className={`font-medium transition ${
                    isActive
                      ? "text-blue-600 border-b-2 border-blue-600 pb-0.5"
                      : "text-gray-600 hover:text-blue-600"
                  }`}
                >
                  {label}
                </Link>
              );
            })}
            <Link
              href="/login"
              className="ml-2 px-4 py-2 bg-blue-600 text-white rounded-[25px] hover:bg-blue-700 font-semibold transition inline-flex items-center gap-2"
            >
              Sign In
              <i className="fas fa-arrow-right text-sm" aria-hidden />
            </Link>
          </nav>
          <div className="flex items-center gap-2 md:hidden">
            <button
              type="button"
              onClick={() => setMobileNavOpen(true)}
              className="p-2 rounded-lg border border-gray-300 text-gray-700"
              aria-label="Open menu"
            >
              <i className="fas fa-bars" />
            </button>
            <Link
              href="/login"
              className="px-3 py-2 bg-blue-600 text-white rounded-[25px] text-sm font-semibold"
            >
              Sign In
            </Link>
          </div>
        </div>
      </header>

      {/* Mobile nav backdrop */}
      {mobileNavOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-[1001] md:hidden"
          onClick={() => setMobileNavOpen(false)}
          aria-hidden
        />
      )}

      {/* Mobile nav drawer */}
      <div
        className={`fixed top-0 right-0 h-full w-72 max-w-[85vw] bg-white shadow-xl z-[1002] transform transition-transform duration-300 md:hidden ${
          mobileNavOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="p-4 flex items-center justify-between border-b border-gray-200">
          <div className="flex items-center gap-2">
            <i className="fas fa-coins text-blue-600 text-xl" />
            <div>
              <div className="font-bold text-gray-900">{businessInfo.name}</div>
              <div className="text-xs text-gray-500 uppercase tracking-wide">Digital Banking System</div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setMobileNavOpen(false)}
            className="p-2 rounded-lg text-gray-600 hover:bg-gray-100"
            aria-label="Close menu"
          >
            <i className="fas fa-times" />
          </button>
        </div>
        <ul className="p-4 space-y-1">
          {navLinks.map(({ href, label }) => (
            <li key={href}>
              <Link
                href={href}
                onClick={() => setMobileNavOpen(false)}
                className="block py-3 px-2 rounded-lg text-gray-700 hover:bg-gray-100 font-medium"
              >
                {label}
              </Link>
            </li>
          ))}
        </ul>
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200">
          <Link
            href="/login"
            onClick={() => setMobileNavOpen(false)}
            className="flex items-center justify-center gap-2 w-full py-3 bg-blue-600 text-white rounded-[25px] font-semibold"
          >
            <i className="fas fa-user" />
            Sign In
          </Link>
        </div>
      </div>
    </>
  );
}
