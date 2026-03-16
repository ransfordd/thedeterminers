"use client";

import { useActionState } from "react";
import { uploadDocument, deleteDocument, type DocumentUploadState } from "@/app/actions/account";

const DOC_TYPES = [
  { value: "ghana_card", label: "Ghana Card" },
  { value: "proof_of_address", label: "Proof of Address" },
  { value: "bank_statement", label: "Bank Statement" },
  { value: "proof_of_income", label: "Proof of Income" },
  { value: "guarantor_id", label: "Guarantor ID" },
  { value: "other", label: "Other" },
];

const initialState: DocumentUploadState = {};

type Doc = {
  id: number;
  documentType: string;
  fileName: string;
  status: string;
  createdAt: Date | string;
  filePath: string;
};

export function DocumentUploadCard({ documents }: { documents: Doc[] }) {
  const [uploadState, uploadFormAction] = useActionState(uploadDocument, initialState);

  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4">
      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
        <i className="fas fa-file-upload" />
        Document upload
      </h3>
      <form action={uploadFormAction} className="space-y-3 mb-4">
        {uploadState?.error && (
          <p className="text-sm text-red-600 dark:text-red-400">{uploadState.error}</p>
        )}
        {uploadState?.success && (
          <p className="text-sm text-green-600 dark:text-green-400">Document uploaded.</p>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label htmlFor="document_type" className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
              Document type
            </label>
            <select
              id="document_type"
              name="document_type"
              required
              className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 py-1.5 text-sm"
            >
              <option value="">Select</option>
              {DOC_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="document_file" className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
              File (PDF, JPG, PNG. Max 5MB)
            </label>
            <input
              id="document_file"
              name="document_file"
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              required
              className="w-full text-sm text-gray-600 dark:text-gray-400 file:mr-2 file:rounded file:border-0 file:bg-indigo-50 file:px-3 file:py-1.5 file:text-indigo-700 dark:file:bg-indigo-900/30 dark:file:text-indigo-300"
            />
          </div>
        </div>
        <div>
          <label htmlFor="doc_description" className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
            Description (optional)
          </label>
          <textarea
            id="doc_description"
            name="description"
            rows={2}
            className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 py-1.5 text-sm"
          />
        </div>
        <button
          type="submit"
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700"
        >
          <i className="fas fa-upload" /> Upload
        </button>
      </form>
      <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
        <h4 className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">Uploaded documents</h4>
        {documents.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400 py-2">No documents yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-1.5 pr-2 text-gray-600 dark:text-gray-400 font-medium">Type</th>
                  <th className="text-left py-1.5 pr-2 text-gray-600 dark:text-gray-400 font-medium">File</th>
                  <th className="text-left py-1.5 pr-2 text-gray-600 dark:text-gray-400 font-medium">Status</th>
                  <th className="text-left py-1.5 pr-2 text-gray-600 dark:text-gray-400 font-medium">Date</th>
                  <th className="text-left py-1.5 text-gray-600 dark:text-gray-400 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {documents.map((d) => (
                  <tr key={d.id} className="border-b border-gray-100 dark:border-gray-800">
                    <td className="py-1.5 pr-2 capitalize">
                      {d.documentType.replace(/_/g, " ")}
                    </td>
                    <td className="py-1.5 pr-2 truncate max-w-[120px]">{d.fileName}</td>
                    <td className="py-1.5 pr-2">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded text-xs ${
                          d.status === "approved"
                            ? "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200"
                            : d.status === "rejected"
                            ? "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200"
                            : "bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200"
                        }`}
                      >
                        {d.status}
                      </span>
                    </td>
                    <td className="py-1.5 pr-2 text-gray-500 dark:text-gray-400 text-xs">
                      {new Date(d.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-1.5 flex gap-2">
                      <a
                        href={d.filePath}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-indigo-600 dark:text-indigo-400 hover:underline text-xs"
                      >
                        View
                      </a>
                      {d.status === "pending" && (
                        <form
                          action={async (formData: FormData) => {
                            await deleteDocument(formData);
                          }}
                          className="inline"
                          onSubmit={(e) => {
                            if (!confirm("Delete this document?")) e.preventDefault();
                          }}
                        >
                          <input type="hidden" name="documentId" value={d.id} />
                          <button
                            type="submit"
                            className="text-red-600 dark:text-red-400 hover:underline text-xs"
                          >
                            Delete
                          </button>
                        </form>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
