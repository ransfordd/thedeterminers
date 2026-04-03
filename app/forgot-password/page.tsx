"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Suspense, useActionState, useEffect, useRef, useState } from "react";
import {
  completePasswordReset,
  requestPasswordReset,
  submitAdminEmailForPasswordReset,
  verifyPasswordResetOtp,
  type PasswordResetCompleteState,
  type PasswordResetFlowState,
  type PasswordResetOtpState,
} from "@/app/actions/password-reset";

const flowInitial: PasswordResetFlowState = {};
const otpInitial: PasswordResetOtpState = {};
const completeInitial: PasswordResetCompleteState = {};

function ForgotPasswordInner() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [step, setStep] = useState<
    "identifier" | "email" | "emailResult" | "waitApproval" | "otp" | "newPassword" | "done"
  >("identifier");

  const [flowState, flowAction, flowPending] = useActionState(requestPasswordReset, flowInitial);
  const [emailState, emailAction, emailPending] = useActionState(submitAdminEmailForPasswordReset, flowInitial);
  const [otpState, otpAction, otpPending] = useActionState(verifyPasswordResetOtp, otpInitial);
  const [completeState, completeAction, completePending] = useActionState(completePasswordReset, completeInitial);

  /** After "Try another email", stale success in emailState must not immediately send user back to emailResult. */
  const skipNextEmailResult = useRef(false);

  useEffect(() => {
    if (step !== "identifier") return;
    if (flowState?.needsEmail) setStep("email");
    else if (flowState?.pendingApproval) setStep("waitApproval");
    else if (flowState?.success && !flowState?.needsEmail && !flowState?.pendingApproval) {
      setStep("otp");
    }
  }, [flowState, step]);

  useEffect(() => {
    if (emailState?.pendingApproval && step === "email") {
      setStep("waitApproval");
      return;
    }
    if (skipNextEmailResult.current) {
      skipNextEmailResult.current = false;
      return;
    }
    if (emailState?.success && !emailState?.pendingApproval && step === "email") {
      setStep("emailResult");
    }
  }, [emailState, step]);

  useEffect(() => {
    if (otpState?.success) setStep("newPassword");
  }, [otpState]);

  useEffect(() => {
    if (completeState?.success) setStep("done");
  }, [completeState]);

  return (
    <div className="min-h-screen w-full bg-[#667eea] flex flex-col items-center justify-center p-4">
      <div className="absolute top-8 left-8 z-10">
        <Link
          href="/login"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/95 text-gray-800 text-sm font-semibold hover:bg-white hover:shadow-md transition-all border border-gray-200/80"
        >
          <i className="fas fa-arrow-left" /> Back to login
        </Link>
      </div>

      <div className="w-full max-w-[420px] relative z-[1]">
        <div className="bg-white rounded-[20px] shadow-[0_20px_40px_rgba(0,0,0,0.1)] overflow-hidden">
          <div className="bg-[#667eea] text-white px-8 pt-10 pb-8 text-center">
            <div className="text-4xl mb-4 opacity-95">
              <i className="fas fa-key" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Reset password</h1>
            <p className="text-white/95 text-sm font-light">
              {step === "waitApproval"
                ? "Waiting for an administrator to approve your request."
                : "We will guide you through secure steps."}
            </p>
          </div>

          <div className="p-6 bg-[#fafbfc] space-y-4">
            {step === "identifier" && (
              <form action={flowAction} className="space-y-4">
                <p className="text-sm text-gray-600">
                  Enter the username or email you use to sign in. Staff accounts may require extra verification.
                </p>
                {flowState?.error && (
                  <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-800 text-sm">{flowState.error}</div>
                )}
                {flowState?.message && !flowState.error && (
                  <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 text-blue-900 text-sm">{flowState.message}</div>
                )}
                <label className="block text-sm font-medium text-gray-800 mb-1">Username or email</label>
                <input
                  name="identifier"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  required
                  className="w-full border-2 border-[#667eea]/80 rounded-[10px] px-4 py-3 outline-none focus:ring-2 focus:ring-[#667eea]/20"
                  placeholder="Your login identifier"
                />
                <button
                  type="submit"
                  disabled={flowPending}
                  className="w-full bg-[#667eea] hover:bg-[#5568d3] disabled:opacity-70 text-white font-semibold py-3 rounded-[10px]"
                >
                  {flowPending ? "Please wait…" : "Continue"}
                </button>
              </form>
            )}

            {step === "emailResult" && (
              <div className="space-y-4 text-sm text-gray-700">
                <p>
                  If that email matches your administrator account, a reset request was sent for approval. If not, try
                  again with the exact email on file or contact support.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    skipNextEmailResult.current = true;
                    setStep("email");
                  }}
                  className="w-full py-2 text-[#667eea] font-medium hover:underline"
                >
                  Try another email
                </button>
                <Link href="/login" className="block w-full text-center text-gray-600 hover:underline">
                  Back to login
                </Link>
              </div>
            )}

            {step === "email" && (
              <form action={emailAction} className="space-y-4">
                <p className="text-sm text-gray-600">
                  Administrator accounts must confirm the <strong>registered email</strong> on the account before a
                  reset can be sent for approval.
                </p>
                {emailState?.error && (
                  <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-800 text-sm">{emailState.error}</div>
                )}
                <input type="hidden" name="identifier" value={identifier} />
                <label className="block text-sm font-medium text-gray-800 mb-1">Registered email</label>
                <input
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  className="w-full border-2 border-[#667eea]/80 rounded-[10px] px-4 py-3 outline-none focus:ring-2 focus:ring-[#667eea]/20"
                  placeholder="Exact email on your account"
                />
                <button
                  type="submit"
                  disabled={emailPending}
                  className="w-full bg-[#667eea] hover:bg-[#5568d3] disabled:opacity-70 text-white font-semibold py-3 rounded-[10px]"
                >
                  {emailPending ? "Please wait…" : "Verify email"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setStep("identifier");
                  }}
                  className="w-full text-sm text-[#667eea] hover:underline"
                >
                  Back
                </button>
              </form>
            )}

            {step === "waitApproval" && (
              <div className="space-y-3 text-sm text-gray-700">
                <p>
                  Your request is with a business administrator. After approval, you will receive an SMS code on the
                  phone number linked to your account. If you do not receive it, contact support.
                </p>
                <p className="text-xs text-gray-500">
                  Only another administrator can approve this. If you are the sole admin, use your documented break-glass
                  process.
                </p>
                <p className="text-xs text-gray-600">
                  Once an administrator has approved and you have received the text message, continue here to enter your
                  code.
                </p>
                <button
                  type="button"
                  onClick={() => setStep("otp")}
                  className="w-full bg-[#667eea] hover:bg-[#5568d3] text-white font-semibold py-3 rounded-[10px]"
                >
                  I received my SMS code
                </button>
                <Link href="/login" className="block text-center text-[#667eea] font-medium hover:underline text-sm">
                  Return to login
                </Link>
              </div>
            )}

            {step === "otp" && (
              <form action={otpAction} className="space-y-4">
                <p className="text-sm text-gray-600">
                  Enter the 6-digit code sent to your phone by SMS.
                </p>
                {otpState?.error && (
                  <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-800 text-sm">{otpState.error}</div>
                )}
                <input type="hidden" name="identifier" value={identifier} />
                <label className="block text-sm font-medium text-gray-800 mb-1">SMS code</label>
                <input
                  name="code"
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  required
                  className="w-full border-2 border-[#667eea]/80 rounded-[10px] px-4 py-3 outline-none tracking-widest text-center text-lg"
                  placeholder="000000"
                />
                <button
                  type="submit"
                  disabled={otpPending}
                  className="w-full bg-[#667eea] hover:bg-[#5568d3] disabled:opacity-70 text-white font-semibold py-3 rounded-[10px]"
                >
                  {otpPending ? "Checking…" : "Verify code"}
                </button>
              </form>
            )}

            {step === "newPassword" && (
              <form action={completeAction} className="space-y-4">
                <p className="text-sm text-gray-600">Choose a new password for your account.</p>
                {completeState?.error && (
                  <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-800 text-sm">{completeState.error}</div>
                )}
                <input type="hidden" name="identifier" value={identifier} />
                <label className="block text-sm font-medium text-gray-800 mb-1">New password</label>
                <input
                  name="newPassword"
                  type="password"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  className="w-full border-2 border-[#667eea]/80 rounded-[10px] px-4 py-3 outline-none"
                />
                <label className="block text-sm font-medium text-gray-800 mb-1">Confirm password</label>
                <input
                  name="confirmPassword"
                  type="password"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  className="w-full border-2 border-[#667eea]/80 rounded-[10px] px-4 py-3 outline-none"
                />
                <button
                  type="submit"
                  disabled={completePending}
                  className="w-full bg-[#667eea] hover:bg-[#5568d3] disabled:opacity-70 text-white font-semibold py-3 rounded-[10px]"
                >
                  {completePending ? "Saving…" : "Update password"}
                </button>
              </form>
            )}

            {step === "done" && (
              <div className="text-center space-y-4">
                <p className="text-green-800 font-medium">Your password was updated.</p>
                <button
                  type="button"
                  onClick={() => router.push("/login")}
                  className="w-full bg-[#667eea] hover:bg-[#5568d3] text-white font-semibold py-3 rounded-[10px]"
                >
                  Go to login
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ForgotPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#667eea] flex items-center justify-center text-white">Loading…</div>
      }
    >
      <ForgotPasswordInner />
    </Suspense>
  );
}
