"use client";

import { useActionState } from "react";
import { createProduct, type ProductState } from "@/app/actions/products";

const initialState: ProductState = {};

export function NewProductForm({
  defaultInterestRate = 0,
  defaultMinAmount = 0,
  defaultMaxAmount = 0,
}: {
  defaultInterestRate?: number;
  defaultMinAmount?: number;
  defaultMaxAmount?: number;
} = {}) {
  const [state, formAction] = useActionState(createProduct, initialState);

  return (
    <form action={formAction} className="space-y-4 max-w-2xl">
      {state?.error && (
        <div className="rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 text-sm">
          {state.error}
        </div>
      )}
      {state?.success && (
        <div className="rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300 px-4 py-3 text-sm">
          Product created successfully.
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="productName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Product name <span className="text-red-500">*</span>
          </label>
          <input
            id="productName"
            name="productName"
            type="text"
            required
            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2"
          />
        </div>
        <div>
          <label htmlFor="productCode" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Product code <span className="text-red-500">*</span>
          </label>
          <input
            id="productCode"
            name="productCode"
            type="text"
            required
            placeholder="e.g. LN-001"
            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2 uppercase"
          />
        </div>
      </div>
      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Description
        </label>
        <textarea
          id="description"
          name="description"
          rows={2}
          className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2"
        />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="minAmount" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Min amount (GHS) <span className="text-red-500">*</span>
          </label>
          <input
            id="minAmount"
            name="minAmount"
            type="number"
            step="0.01"
            min="0"
            required
            defaultValue={String(defaultMinAmount)}
            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2"
          />
        </div>
        <div>
          <label htmlFor="maxAmount" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Max amount (GHS) <span className="text-red-500">*</span>
          </label>
          <input
            id="maxAmount"
            name="maxAmount"
            type="number"
            step="0.01"
            min="0"
            required
            defaultValue={String(defaultMaxAmount)}
            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2"
          />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="interestRate" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Interest rate (%)
          </label>
          <input
            id="interestRate"
            name="interestRate"
            type="number"
            step="0.01"
            min="0"
            defaultValue={String(defaultInterestRate)}
            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2"
          />
        </div>
        <div>
          <label htmlFor="interestType" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Interest type
          </label>
          <select
            id="interestType"
            name="interestType"
            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2"
          >
            <option value="flat">Flat</option>
            <option value="reducing_balance">Reducing balance</option>
          </select>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="minTermMonths" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Min term (months)
          </label>
          <input
            id="minTermMonths"
            name="minTermMonths"
            type="number"
            min="1"
            defaultValue="1"
            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2"
          />
        </div>
        <div>
          <label htmlFor="maxTermMonths" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Max term (months)
          </label>
          <input
            id="maxTermMonths"
            name="maxTermMonths"
            type="number"
            min="1"
            defaultValue="12"
            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2"
          />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="processingFeeRate" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Processing fee rate (%)
          </label>
          <input
            id="processingFeeRate"
            name="processingFeeRate"
            type="number"
            step="0.01"
            min="0"
            defaultValue="0"
            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2"
          />
        </div>
        <div>
          <label htmlFor="status" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Status
          </label>
          <select
            id="status"
            name="status"
            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2"
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>
      <button type="submit" className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white font-medium text-sm hover:bg-blue-700">
        <i className="fas fa-plus" /> Create product
      </button>
    </form>
  );
}
