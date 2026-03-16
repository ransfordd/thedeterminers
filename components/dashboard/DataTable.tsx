import { ReactNode } from "react";

export interface DataTableColumn<T> {
  key: string;
  header: string;
  render?: (row: T) => ReactNode;
  className?: string;
}

export interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  data: T[];
  caption?: string;
  emptyMessage?: string;
  className?: string;
}

export function DataTable<T extends object>({
  columns,
  data,
  caption,
  emptyMessage = "No data",
  className = "",
}: DataTableProps<T>) {
  if (data.length === 0) {
    return (
      <div
        className={`rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-hidden ${className}`}
      >
        {caption && (
          <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {caption}
            </p>
          </div>
        )}
        <div className="p-6 text-center text-gray-500 dark:text-gray-400 text-sm">
          {emptyMessage}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-hidden ${className}`}
    >
      {caption && (
        <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {caption}
          </p>
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`px-4 py-2 text-left font-medium text-gray-700 dark:text-gray-300 ${col.className ?? ""}`}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, i) => (
              <tr
                key={i}
                className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50"
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={`px-4 py-2 text-gray-900 dark:text-gray-100 ${col.className ?? ""}`}
                  >
                    {col.render
                      ? col.render(row)
                      : String((row as Record<string, unknown>)[col.key] ?? "")}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
