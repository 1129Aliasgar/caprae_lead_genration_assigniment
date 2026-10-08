"use client";

/**
 * One lead, as a table row.
 *
 * A table rather than a card grid because these are records, not tiles: the
 * user's job here is to compare leads — score against salary against location —
 * and a grid of cards forces that comparison to happen from memory. Rows align
 * their columns, so scanning down the score column is a glance rather than a
 * hunt, and 40 leads fit on a screen instead of three.
 *
 * Rows are clickable and open the lead's real posting in a new tab, because
 * the actionable outcome of reading a lead is applying to it — not reading more
 * about it on our site. The detail page stays available for the score
 * breakdown and full description.
 *
 * `finalScore` comes from `lead.scoreBreakdown.finalScore`; there is no flat
 * `lead.finalScore` in the API response.
 */

import Link from "next/link";
import { ExternalLink, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TierBadge } from "./TierBadge";
import { APP_ROUTES } from "@/lib/constants";
import { cn } from "cn";

/**
 * Salary as a readable range.
 *
 * The dataset's salary columns are frequently null, so "Not disclosed" is a
 * real state and gets shown — a blank cell reads as missing data rather than
 * as a deliberate answer.
 */
function formatSalary(lead) {
  const { minSalary, maxSalary, salaryMidpoint, currency } = lead;

  if (minSalary > 0 && maxSalary > 0) {
    return `${Math.round(minSalary / 1000)}k–${Math.round(maxSalary / 1000)}k${
      currency ? ` ${currency}` : ""
    }`;
  }

  if (salaryMidpoint > 0) {
    return `~${Math.round(salaryMidpoint / 1000)}k${currency ? ` ${currency}` : ""}`;
  }

  return "—";
}

/** Engagement, as a percentage — the only comparable form of applies/views. */
function formatEngagement(lead) {
  if (!lead.views || lead.views <= 0) {
    return "—";
  }

  return `${Math.round((lead.applies / lead.views) * 100)}%`;
}

/**
 * Score colour, using the same bands as the tier thresholds so a green row and
 * an A badge never disagree.
 *
 * `--score-*-text`, not `--tier-*-fg`: this text sits on the page background,
 * while a tier chip's foreground has to contrast with a saturated fill. The two
 * requirements are opposite, and sharing one token put near-black text on a
 * near-black background in dark mode.
 */
function scoreClass(value) {
  if (value >= 0.8) return "text-score-high-text";
  if (value >= 0.6) return "text-score-mid-text";
  return "text-muted-foreground";
}

export function LeadTable({ leads }) {
  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-[30%]">Job</TableHead>
            <TableHead className="w-[18%]">Location</TableHead>
            <TableHead className="w-[14%] text-right">Salary</TableHead>
            <TableHead className="w-[10%] text-right">Match</TableHead>
            <TableHead className="w-[10%] text-right">Apply rate</TableHead>
            <TableHead className="w-[10%]">Level</TableHead>
            <TableHead className="w-[8%] text-right">
              <span className="sr-only">Open</span>
            </TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {leads.map((lead) => {
            const finalScore = lead.scoreBreakdown?.finalScore ?? 0;

            /*
             * The destination is the real posting. `applicationUrl` is the
             * company's own form when present, which is a better outcome than
             * LinkedIn's; `jobPostingUrl` is the fallback.
             */
            const target = lead.applicationUrl || lead.jobPostingUrl;

            return (
              <TableRow
                key={lead.jobId}
                className="group cursor-pointer"
                onClick={() => {
                  if (target) {
                    window.open(target, "_blank", "noopener,noreferrer");
                  } else {
                    window.location.href = APP_ROUTES.leadDetail(lead.jobId);
                  }
                }}
              >
                {/*
                  The job title is a real link, not just a clickable row.

                  Two reasons: keyboard users can reach it without knowing the
                  row is interactive, and a screen reader announces it as a link
                  rather than as an unlabelled row. The row's onClick is the
                  mouse convenience; this is the accessible path. Both point
                  at the same place.
                */}
                <TableCell className="font-medium">
                  {target ? (
                    <a
                      href={target}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(event) => event.stopPropagation()}
                      className="line-clamp-2 underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {lead.title}
                    </a>
                  ) : (
                    <Link
                      href={APP_ROUTES.leadDetail(lead.jobId)}
                      onClick={(event) => event.stopPropagation()}
                      className="line-clamp-2 underline-offset-4 hover:underline"
                    >
                      {lead.title}
                    </Link>
                  )}

                  <span className="mt-1 block text-xs text-muted-foreground">
                    {/* The dataset has no company name, only a numeric id. */}
                    Company #{lead.companyId}
                  </span>
                </TableCell>

                <TableCell>
                  <span className="flex items-center gap-1.5 text-sm">
                    <MapPin
                      className="size-3 shrink-0 text-muted-foreground"
                      aria-hidden="true"
                    />
                    <span className="truncate">
                      {lead.location || "Not stated"}
                    </span>
                    {lead.remoteAllowed === 1 ? (
                      <Badge variant="secondary" className="shrink-0">
                        Remote
                      </Badge>
                    ) : null}
                  </span>
                </TableCell>

                <TableCell className="text-right text-sm tabular-nums">
                  {formatSalary(lead)}
                </TableCell>

                <TableCell className="text-right">
                  <span
                    className={cn(
                      "font-semibold tabular-nums",
                      scoreClass(finalScore),
                    )}
                  >
                    {Math.round(finalScore * 100)}%
                  </span>
                </TableCell>

                <TableCell className="text-right text-sm tabular-nums text-muted-foreground">
                  {formatEngagement(lead)}
                </TableCell>

                <TableCell>
                  <div className="flex flex-col gap-1.5">
                    <TierBadge tier={lead.tier} score={finalScore} />

                    {/*
                      Only the top reason. The full list is on the detail page —
                      a reason column with chips would push the table wider than
                      the screen and undo the alignment.
                    */}
                    {lead.whyMatched?.[0] ? (
                      <span className="line-clamp-1 text-xs text-muted-foreground">
                        {lead.whyMatched[0]}
                      </span>
                    ) : null}
                  </div>
                </TableCell>

                <TableCell className="text-right">
                  {target ? (
                    <ExternalLink
                      className="ml-auto size-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
                      aria-hidden="true"
                    />
                  ) : null}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
