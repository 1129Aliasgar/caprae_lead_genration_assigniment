"use client";

/**
 * The ranked lead table, with pagination.
 *
 * The backend has no pagination — `topN` is the only bound, capped at 100 — so
 * the page fetches once and this slices. The page number stays in the URL, so
 * a view is shareable and survives a refresh.
 *
 * Pagination appears only when there is more than one page of results. A
 * single page showing "Page 1 of 1" is noise.
 */

import { Suspense, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LeadTable } from "./LeadTable";
import { EmptyState } from "./EmptyState";
import { LeadListSkeleton } from "./LoadingSkeleton";
import { LEADS_PER_PAGE } from "@/lib/constants";

/**
 * Reads `?page=` and slices the already-fetched lead list.
 *
 * Split out from the exported `LeadList` so `useSearchParams` sits behind a
 * `Suspense` boundary. The page number only exists at runtime, so without one
 * the build fails with `CLIENT_HOOK_DYNAMIC`.
 */
function PaginatedLeadList({ leads }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const page = Math.max(1, Number(searchParams.get("page")) || 1);

  const { visible, pages } = useMemo(() => {
    const computed = Math.max(1, Math.ceil(leads.length / LEADS_PER_PAGE));

    const start = (page - 1) * LEADS_PER_PAGE;

    return {
      visible: leads.slice(start, start + LEADS_PER_PAGE),
      pages: computed,
    };
  }, [leads, page]);

  /**
   * Page changes replace the URL rather than pushing a new history entry.
   *
   * `scroll: false` keeps the viewport where it is — the list is already in
   * view, and scrolling back to the top on every page change is disorienting
   * when comparing cards.
   */
  const goToPage = (next) => {
    const params = new URLSearchParams(searchParams.toString());

    if (next <= 1) {
      params.delete("page");
    } else {
      params.set("page", String(next));
    }

    const query = params.toString();

    router.push(query ? `/leads?${query}` : "/leads", { scroll: false });
  };

  const isLastPage = page >= pages;

  return (
    <section aria-label="All ranked leads" className="space-y-6">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <div>
          <h2 className="text-lg font-semibold">Ranked leads</h2>
          <p className="text-sm text-muted-foreground">
            Every lead that matched your profile, best first. Click a job title
            to open the posting.
          </p>
        </div>

        <p className="text-sm tabular-nums text-muted-foreground">
          {leads.length} lead{leads.length === 1 ? "" : "s"}
        </p>
      </div>

      <LeadTable leads={visible} />

      {pages > 1 ? (
        <nav
          aria-label="Pagination"
          className="flex items-center justify-center gap-3 pt-2"
        >
          <Button
            variant="outline"
            size="sm"
            onClick={() => goToPage(page - 1)}
            disabled={page <= 1}
          >
            <ChevronLeft className="size-4" aria-hidden="true" />
            Previous
          </Button>

          <span className="text-sm tabular-nums text-muted-foreground">
            Page {page} of {pages}
          </span>

          <Button
            variant="outline"
            size="sm"
            onClick={() => goToPage(page + 1)}
            disabled={isLastPage}
          >
            Next
            <ChevronRight className="size-4" aria-hidden="true" />
          </Button>
        </nav>
      ) : null}
    </section>
  );
}

/**
 * The list, with its runtime-only paging state behind a `Suspense` boundary.
 *
 * The fallback is a skeleton: the lead data is already server-fetched and
 * serialised into the HTML, so what streams in here is only the page number —
 * but the boundary has to exist, so it renders a table-shaped placeholder and
 * the swap is not jarring.
 */
export function LeadList({ leads = [] }) {
  if (leads.length === 0) {
    return <EmptyState />;
  }

  return (
    <Suspense fallback={<LeadListSkeleton />}>
      <PaginatedLeadList leads={leads} />
    </Suspense>
  );
}