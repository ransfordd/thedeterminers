"use client";

import Link from "next/link";
import { useActionState } from "react";
import { updateProduct, type ProductState } from "@/app/actions/products";

const initialState: ProductState = {};

type Props = {
  productId: number;
  defaultValue: {
    productName: string;
    productCode: string;
    description: string;
    minAmount: number;
    maxAmount: number;
    interestRate: number;
    interestType: string;
    minTermMonths: number;
    maxTermMonths: number;
    processingFeeRate: number;
    status: string;
  };
};

const inputClass = "w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2";

export function EditProductForm({ productId, defaultValue: d }: Props) {
  const [state, formAction] = useActionState(updateProduct, initialState);

  return (
    <form action={formAction} className="space-y-4 max-w-2xl">
      <input type="hidden" name="productId" value={productId} />
      {state?.error && (
        <div className="rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 text-sm">
          {state.error}
        </div>
      )}
      {state?.success && (
        <div className="rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300 px-4 py-3 text-sm">
          Product updated. <Link href="/admin/products" className="font-medium underline">Back to list</Link>
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="productName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Product name <span className="text-red-500">*</span></label>
          <input id="productName" name="productName" type="text" required defaultValue={d.productName} className={inputClass} />
        </div>
        <div>
          <label htmlFor="productCode" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Product code <span className="text-red-500">*</span></label>
          <input id="productCode" name="productCode" type="text" required defaultValue={d.productCode} className={inputClass + " uppercase"} />
        </div>
      </div>
      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
        <textarea id="description" name="description" rows={2} defaultValue={d.description} className={inputClass} />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="minAmount" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Min amount (GHS) <span className="text-red-500">*</span></label>
          <input id="minAmount" name="minAmount" type="number" step="0.01" min="0" required defaultValue={d.minAmount} className={inputClass} />
        </div>
        <div>
          <label htmlFor="maxAmount" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Max amount (GHS) <span className="text-red-500">*</span></label>
          <input id="maxAmount" name="maxAmount" type="number" step="0.01" min="0" required defaultValue={d.maxAmount} className={inputClass} />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="interestRate" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Interest rate (%)</label>
          <input id="interestRate" name="interestRate" type="number" step="0.01" min="0" defaultValue={d.interestRate} className={inputClass} />
        </div>
        <div>
          <label htmlFor="interestType" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Interest type</label>
          <select id="interestType" name="interestType" className={inputClass} defaultValue={d.interestType}>
            <option value="flat">Flat</option>
            <option value="reducing_balance">Reducing balance</option>
          </select>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="minTermMonths" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Min term (months)</label>
          <input id="minTermMonths" name="minTermMonths" type="number" min="1" defaultValue={d.minTermMonths} className={inputClass} />
        </div>
        <div>
          <label htmlFor="maxTermMonths" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Max term (months)</label>
          <input id="maxTermMonths" name="maxTermMonths" type="number" min="1" defaultValue={d.maxTermMonths} className={inputClass} />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="processingFeeRate" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Processing fee rate (%)</label>
          <input id="processingFeeRate" name="processingFeeRate" type="number" step="0.01" min="0" defaultValue={d.processingFeeRate} className={inputClass} />
        </div>
        <div>
          <label htmlFor="status" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status</label>
          <select id="status" name="status" className={inputClass} defaultValue={d.status}>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>
      <div className="flex gap-3 pt-2">
        <Link href="/admin/products" className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">Cancel</Link>
        <button type="submit" className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium">
          Update product
        </button>
      </div>
    </form>
  );
}
