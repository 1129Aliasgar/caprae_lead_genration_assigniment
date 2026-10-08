"use client";

/**
 * The six scoring dimensions as labelled bars.
 *
 * Every returned lead carries these numbers — they are the reason the lead
 * ranked where it did, not a re-derivation. A user who can see that a lead
 * scored 0.2 on skills can tell the difference between "no good matches" and
 * "the matches don't use my stack".
 */

import { SCORE_DIMENSIONS } from "@/lib/constants";
import { cn } from "cn";

/**
 * Colour by score band, using the semantic tokens from `globals.css`.
 *
 * The thresholds mirror the backend's tier cut-offs (0.8 / 0.6) so a green bar
 * and an A badge mean the same thing. Not arbitrary decoration: a bar coloured
 * by its own value would be unreadable, and a bar coloured by rank would be
 * misleading in a breakdown whose job is to explain the rank.
 */
function scoreClass(value) {
  if (value >= 0.8) return "bg-score-high";
  if (value >= 0.6) return "bg-score-mid";
  return "bg-score-low";
}

export function ScoreBreakdown({ scoreBreakdown, compact = false }) {
  if (!scoreBreakdown) {
    return null;
  }

  const finalScore = scoreBreakdown.finalScore ?? 0;

  return (
    <div className="space-y-3">
      <dl className="space-y-2.5">
        {SCORE_DIMENSIONS.map((dimension) => {
          const value = scoreBreakdown[dimension.key] ?? 0;
          const percent = Math.round(value * 100);

          return (
            <div key={dimension.key} className="space-y-1">
              <div className="flex items-baseline justify-between gap-2 text-xs">
                <dt className="text-muted-foreground">
                  {dimension.label}
                </dt>
                <dd className="tabular-nums font-medium">{percent}%</dd>
              </div>

              {/*
                `role="progressbar"` with aria-valuenow: the visual bar carries
                the number, and this is what makes it readable to a screen
                reader rather than a decorative div.
              */}
              <div
                role="progressbar"
                aria-label={dimension.label}
                aria-valuenow={percent}
                aria-valuemin={0}
                aria-valuemax={100}
                className="h-1.5 w-full overflow-hidden rounded-full bg-muted"
              >
                <div
                  className={cn("h-full rounded-full transition-all", scoreClass(value))}
                  style={{ width: `${Math.max(percent, 2)}%` }}
                />
              </div>
            </div>
          );
        })}
      </dl>

      {!compact ? (
        <div className="flex items-baseline justify-between border-t pt-3 text-sm">
          <span className="font-medium">Overall match</span>
          <span className="font-semibold tabular-nums">
            {Math.round(finalScore * 100)}%
          </span>
        </div>
      ) : null}
    </div>
  );
}