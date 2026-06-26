"use client";

import { signIn } from "next-auth/react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useState } from "react";
import {
  lookupLoginAccountsByPhone,
  type LoginLookupState,
} from "@/app/actions/login-lookup";
import type { LoginAccountOption } from "@/lib/login-phone";
import { LoginAccountPicker } from "@/components/auth/LoginAccountPicker";
import { isPhoneLikeIdentifier } from "@/lib/phone-format";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/dashboard";
  const success = searchParams.get("success");
  const [usernameOrEmail, setUsernameOrEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [phoneAccounts, setPhoneAccounts] = useState<LoginAccountOption[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [needsPicker, setNeedsPicker] = useState(false);

  const resetPhoneLookup = useCallback(() => {
    setPhoneAccounts([]);
    setSelectedUserId(null);
    setNeedsPicker(false);
  }, []);

  async function runPhoneLookup(phone: string): Promise<LoginLookupState> {
    setLookupLoading(true);
    try {
      return await lookupLoginAccountsByPhone(phone);
    } finally {
      setLookupLoading(false);
    }
  }

  async function handleIdentifierBlur() {
    const trimmed = usernameOrEmail.trim();
    if (!isPhoneLikeIdentifier(trimmed)) {
      resetPhoneLookup();
      return;
    }
    const result = await runPhoneLookup(trimmed);
    if (result.error) {
      setError(result.error);
      resetPhoneLookup();
      return;
    }
    const accounts = result.accounts ?? [];
    setPhoneAccounts(accounts);
    if (accounts.length > 1) {
      setNeedsPicker(true);
      setSelectedUserId(null);
    } else {
      setNeedsPicker(false);
      setSelectedUserId(accounts.length === 1 ? accounts[0]!.id : null);
    }
  }

  function handleIdentifierChange(value: string) {
    setUsernameOrEmail(value);
    setError("");
    if (!isPhoneLikeIdentifier(value.trim())) {
      resetPhoneLookup();
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const trimmed = usernameOrEmail.trim();
      let userIdForSignIn = selectedUserId;

      if (isPhoneLikeIdentifier(trimmed)) {
        let accounts = phoneAccounts;
        if (accounts.length === 0) {
          const result = await runPhoneLookup(trimmed);
          if (result.error) {
            setError(result.error);
            setLoading(false);
            return;
          }
          accounts = result.accounts ?? [];
          setPhoneAccounts(accounts);
        }

        if (accounts.length > 1) {
          setNeedsPicker(true);
          if (!userIdForSignIn) {
            setError("This phone number is linked to several accounts. Select yours, then enter your password.");
            setLoading(false);
            return;
          }
        } else if (accounts.length === 1) {
          userIdForSignIn = accounts[0]!.id;
        }
      } else {
        resetPhoneLookup();
      }

      const res = await signIn("credentials", {
        usernameOrEmail: trimmed,
        password,
        ...(userIdForSignIn != null ? { selectedUserId: String(userIdForSignIn) } : {}),
        redirect: false,
      });

      if (res?.error) {
        if (needsPicker && phoneAccounts.length > 1 && !selectedUserId) {
          setError("Select your account, then enter your password.");
        } else {
          setError("Invalid email, username, phone or password.");
        }
        setLoading(false);
        return;
      }
      router.push(callbackUrl);
      router.refresh();
    } catch {
      setError("Something went wrong.");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen w-full bg-[#667eea] flex flex-col items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-8 left-8 z-10">
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/95 text-gray-800 text-sm font-semibold hover:bg-white hover:shadow-md transition-all border border-gray-200/80"
        >
          <i className="fas fa-arrow-left" /> Back to Home
        </Link>
      </div>

      <div className="w-full max-w-[420px] relative z-[1] animate-slide-up">
        <div className="bg-white rounded-[20px] shadow-[0_20px_40px_rgba(0,0,0,0.1)] overflow-hidden">
          <div className="bg-[#667eea] text-white px-8 pt-12 pb-8 text-center">
            <div className="text-5xl mb-6 opacity-95">
              <i className="fas fa-shield-alt" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Welcome Back</h2>
            <p className="text-white/95 text-lg font-light">
              Sign in to your The Determiners account
            </p>
          </div>

          <div className="p-6 bg-[#fafbfc]">
            {success === "1" && (
              <div className="mb-4 p-3 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 text-green-800 dark:text-green-200 text-sm">
                Account created. Please sign in.
              </div>
            )}
            {error && (
              <div className="mb-4 flex items-center gap-4 p-4 rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800/50">
                <span className="text-red-600 dark:text-red-400">
                  <i className="fas fa-exclamation-triangle" />
                </span>
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white">Invalid Credentials</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{error}</p>
                </div>
              </div>
            )}

            <form onSubmit={onSubmit} className="space-y-5">
              <div>
                <label htmlFor="usernameOrEmail" className="flex items-center gap-2 text-gray-800 font-normal text-[0.95rem] mb-2">
                  <i className="fas fa-user text-[#667eea] w-4 text-center" />
                  Email, username or phone
                </label>
                <input
                  id="usernameOrEmail"
                  type="text"
                  value={usernameOrEmail}
                  onChange={(e) => handleIdentifierChange(e.target.value)}
                  onBlur={handleIdentifierBlur}
                  required
                  placeholder="Email, username or phone number"
                  className="login-input w-full border-2 border-[#667eea]/80 rounded-[10px] px-4 py-3.5 focus:border-[#667eea] focus:ring-2 focus:ring-[#667eea]/20 outline-none transition-all"
                />
                {lookupLoading && (
                  <p className="mt-1.5 text-xs text-gray-500">
                    <i className="fas fa-spinner fa-spin mr-1" /> Checking phone number…
                  </p>
                )}
              </div>

              {needsPicker && phoneAccounts.length > 1 && (
                <LoginAccountPicker
                  accounts={phoneAccounts}
                  selectedUserId={selectedUserId}
                  onSelect={(id) => {
                    setSelectedUserId(id);
                    setError("");
                  }}
                />
              )}

              <div>
                <label htmlFor="password" className="flex items-center gap-2 text-gray-800 font-normal text-[0.95rem] mb-2">
                  <i className="fas fa-lock text-[#667eea] w-4 text-center" />
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="Enter your password"
                    className="login-input w-full border-2 border-[#667eea]/80 rounded-[10px] px-4 py-3.5 pr-12 focus:border-[#667eea] focus:ring-2 focus:ring-[#667eea]/20 outline-none transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#667eea] transition-colors p-1"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    <i className={`fas ${showPassword ? "fa-eye-slash" : "fa-eye"}`} />
                  </button>
                </div>
              </div>

              <div className="flex justify-between items-center">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" className="login-remember-checkbox" />
                  <span className="text-sm text-gray-800">Remember me</span>
                </label>
                <Link
                  href="/forgot-password"
                  className="text-sm font-normal text-[#667eea] hover:text-[#764ba2] hover:underline transition-colors"
                >
                  Forgot Password?
                </Link>
              </div>

              <button
                type="submit"
                disabled={loading || lookupLoading}
                className="w-full flex items-center justify-center gap-2 bg-[#667eea] hover:bg-[#5568d3] disabled:opacity-70 disabled:cursor-not-allowed text-white font-semibold py-3.5 px-6 rounded-[10px] transition-all"
              >
                {loading ? (
                  <>
                    <i className="fas fa-spinner fa-spin" /> Signing In...
                  </>
                ) : (
                  <>
                    <i className="fas fa-arrow-right" /> Sign In
                  </>
                )}
              </button>
            </form>
          </div>

          <div className="py-5 px-6 text-center border-t border-[#e9ecef]" style={{ background: "#f8f9fa" }}>
            <p className="text-[#6c757d] text-[0.95rem] mb-0">
              Don&apos;t have an account?{" "}
              <Link href="/signup" className="text-[#667eea] hover:text-[#764ba2] font-semibold inline-flex items-center gap-1.5 hover:underline transition-colors">
                <i className="fas fa-user-plus" /> Create Account
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#667eea] flex items-center justify-center">
          <div className="text-white/90">Loading…</div>
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
