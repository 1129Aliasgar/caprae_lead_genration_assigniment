"use client";

/**
 * The reasons a lead was recommended, as chips.
 *
 * Generated server-side from the score breakdown — the backend reads each
 * dimension against a threshold and emits a sentence, capped at four and
 * ordered so the most decisive survive truncation.
 *
 * An empty list renders a short explanation rather than nothing. A lead with
 * no stated reason is itself a signal, and a blank space would read as a
 * loading failure.
 */

import { Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function WhyMatchedBadges({ reasons }) {
  if (!reasons || reasons.length === 0) {
    return (
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Sparkles className="size-3.5 shrink-0" aria-hidden="true" />
        No strong match signals — it survived your filters but scored weakly.
      </p>
    );
  }

  return (
    <ul className="flex flex-wrap gap-1.5" aria-label="Why this lead matched">
      {reasons.map((reason) => (
        <li key={reason}>
          <Badge variant="outline" className="font-normal">
            {reason}
          </Badge>
        </li>
      ))}
    </ul>
  );
}