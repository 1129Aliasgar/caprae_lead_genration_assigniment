"use client";

/**
 * Loading placeholders.
 *
 * Skeleton shapes mirror the real card layout — same grid, same heights, same
 * bar positions. A generic spinner into an empty grid reads as a slow page;
 * skeletons that fill in place read as content arriving.
 */

import { Skeleton } from "@/components/ui/skeleton";
import { LEADS_PER_PAGE } from "@/lib/constants";

/** Placeholder for the top-matches strip. */
export function RecommendationSkeleton() {
  return (
    <section aria-label="Loading top matches" aria-busy="true">
      <Skeleton className="h-6 w-40" />

      <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="space-y-3 rounded-lg border p-4">
            <div className="flex items-start justify-between gap-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>

            <Skeleton className="h-8 w-20" />

            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-3/4" />
          </div>
        ))}
      </div>
    </section>
  );
}

/** Placeholder rows for the full list, matching the table's shape. */
export function LeadListSkeleton({ count = LEADS_PER_PAGE }) {
  return (
    <section aria-label="Loading leads" aria-busy="true" className="space-y-6">
      <Skeleton className="h-6 w-48" />

      <div className="overflow-hidden rounded-lg border">
        {/*
          One skeleton block per row, with the same column proportions as the
          real table — so the swap to live data does not shift anything
          horizontally.
        */}
        {Array.from({ length: count }).map((_, index) => (
          <div
            key={index}
            className="flex items-center gap-4 border-b p-4 last:border-b-0"
          >
            <Skeleton className="h-4 w-[28%]" />
            <Skeleton className="h-4 w-[16%]" />
            <Skeleton className="ml-auto h-4 w-[12%]" />
            <Skeleton className="h-4 w-[8%]" />
            <Skeleton className="h-4 w-[8%]" />
            <Skeleton className="h-5 w-[14%] rounded-full" />
          </div>
        ))}
      </div>
    </section>
  );
}

/** Placeholder for the lead detail page. */
export function LeadDetailSkeleton() {
  return (
    <div aria-label="Loading lead" aria-busy="true" className="space-y-6">
      <Skeleton className="h-4 w-32" />

      <div className="space-y-3">
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="h-4 w-1/3" />
      </div>

      <div className="flex gap-2">
        <Skeleton className="h-9 w-40" />
        <Skeleton className="h-9 w-32" />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <Skeleton className="h-64 rounded-lg" />
        <Skeleton className="h-64 rounded-lg" />
      </div>
    </div>
  );
}