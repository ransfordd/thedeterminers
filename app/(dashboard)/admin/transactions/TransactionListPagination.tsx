"use client";

import { Suspense } from "react";
import { TablePagination } from "@/components/dashboard";

function Inner({
  basePath,
  page,
  pageSize,
  hasMore,
}: {
  basePath: string;
  page: number;
  pageSize: number;
  hasMore: boolean;
}) {
  return (
    <TablePagination
      basePath={basePath}
      page={page}
      pageSize={pageSize}
      hasMore={hasMore}
    />
  );
}

export function TransactionListPagination(props: {
  basePath: string;
  page: number;
  pageSize: number;
  hasMore: boolean;
}) {
  return (
    <Suspense fallback={null}>
      <Inner {...props} />
    </Suspense>
  );
}
