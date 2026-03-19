"use client";

import { Suspense } from "react";
import { TablePagination } from "@/components/dashboard";

function Inner({
  basePath,
  page,
  pageSize,
  total,
}: {
  basePath: string;
  page: number;
  pageSize: number;
  total: number;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const hasMore = page < totalPages;

  return (
    <TablePagination
      basePath={basePath}
      page={page}
      pageSize={pageSize}
      hasMore={hasMore}
      total={total}
    />
  );
}

export function AgentsListPagination(props: {
  basePath: string;
  page: number;
  pageSize: number;
  total: number;
}) {
  return (
    <Suspense fallback={null}>
      <Inner {...props} />
    </Suspense>
  );
}
