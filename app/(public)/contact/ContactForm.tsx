"use client";

import { useActionState } from "react";
import type { ContactState } from "@/lib/actions/contact";

const SUBJECT_OPTIONS = [
  { value: "", label: "Select a subject" },
  { value: "general", label: "General Inquiry" },
  { value: "account", label: "Account Support" },
  { value: "loan", label: "Loan Information" },
  { value: "susu", label: "Susu Services" },
  { value: "technical", label: "Technical Support" },
  { value: "complaint", label: "Complaint" },
];

export function ContactForm({
  submitAction,
}: {
  submitAction: (prev: ContactState | null, formData: FormData) => Promise<ContactState>;
}) {
  const [state, formAction] = useActionState(submitAction, null);

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Full Name
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
        />
      </div>
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Email Address
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
        />
      </div>
      <div>
        <label htmlFor="phone" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Phone Number
        </label>
        <input
          id="phone"
          name="phone"
          type="tel"
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
        />
      </div>
      <div>
        <label htmlFor="subject" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Subject
        </label>
        <select
          id="subject"
          name="subject"
          required
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
        >
          {SUBJECT_OPTIONS.map((opt) => (
            <option key={opt.value || "empty"} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="message" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Message
        </label>
        <textarea
          id="message"
          name="message"
          required
          rows={5}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white resize-y"
          placeholder="Tell us how we can help you..."
        />
      </div>
      {state?.error && (
        <p className="text-sm text-red-600 dark:text-red-400">{state.error}</p>
      )}
      {state?.ok && (
        <p className="text-sm text-green-600 dark:text-green-400">
          Thank you. Your message has been sent.
        </p>
      )}
      <button
        type="submit"
        className="inline-flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition"
      >
        <i className="fas fa-paper-plane" aria-hidden />
        Send Message
      </button>
    </form>
  );
}
