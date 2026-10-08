"use client";

/**
 * The A/B/C rank badge.
 *
 * The backend computes the tier — A ≥ 0.8, B ≥ 0.6, else C — and this only
 * presents it. A tier C is not a bad lead: the hard filters already removed
 * ineligible ones, so a C means a preference was set narrowly. The tooltip
 * says so rather than leaving the user to assume otherwise.
 */

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { TIERS } from "@/lib/constants";

export function TierBadge({ tier, score }) {
  const config = TIERS[tier];

  /*
   * An unrecognised tier renders nothing. The backend only emits A, B or C, so
   * a miss means the payload changed — and a badge reading "undefined" is
   * worse than no badge.
   */
  if (!config) {
    return null;
  }

  const scoreText =
    score !== undefined && score !== null
      ? ` · ${Math.round(score * 100)}% match`
      : "";

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge className={`${config.className} shrink-0`}>
          {config.label}
        </Badge>
      </TooltipTrigger>

      <TooltipContent>
        <p className="font-medium">
          Tier {tier}
          {scoreText}
        </p>
        <p className="text-muted-foreground">{config.description}</p>
      </TooltipContent>
    </Tooltip>
  );
}