"use client";

/**
 * What the user sees when nothing matched.
 *
 * Each cause needs a different fix, so they get separate components: pointing
 * someone at their preferences when the real problem is an empty profile sends
 * them to edit something that is already fine.
 */

import Link from "next/link";
import { SearchX, ServerCrash } from "lucide-react";
import { Button } from "@/components/ui/button";
import { APP_ROUTES } from "@/lib/constants";

/**
 * A ranking that ran and matched nothing.
 *
 * Scoring is a weighted similarity, not a filter — a lead that scores badly is
 * still returned. So an empty list means the profile carries almost no signal:
 * typically a resume with no recognisable titles or skills.
 */
export function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center">
      <SearchX
        className="size-10 text-muted-foreground/60"
        aria-hidden="true"
      />

      <h2 className="mt-4 text-base font-semibold">No leads matched</h2>

      <p className="mt-2 max-w-md text-sm text-muted-foreground">
        Leads are ranked, not filtered — so an empty result means we couldn&apos;t
        read much from your resume. Try pasting one that spells out your job
        titles and the tools you use.
      </p>

      <Button asChild variant="outline" className="mt-6">
        <Link href={APP_ROUTES.profile}>Update my resume</Link>
      </Button>
    </div>
  );
}

/**
 * No profile to rank against.
 *
 * The backend refuses to rank without a profile rather than guessing at one,
 * so the only fix is to paste a resume.
 */
export function ProfileIncompleteState({ message }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center">
      <SearchX
        className="size-10 text-muted-foreground/60"
        aria-hidden="true"
      />

      <h2 className="mt-4 text-base font-semibold">Paste your resume first</h2>

      <p className="mt-2 max-w-md text-sm text-muted-foreground">
        {message ??
          "We match leads against what we read from your resume, so there's nothing to rank until you paste one."}
      </p>

      <Button asChild className="mt-6">
        <Link href={APP_ROUTES.profile}>Build my profile</Link>
      </Button>
    </div>
  );
}

/**
 * Backend unreachable.
 *
 * Distinct from both above: nothing is wrong with the profile, the request
 * simply failed.
 */
export function BackendUnreachableState({ message }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-destructive/30 bg-destructive/5 py-16 text-center">
      <ServerCrash
        className="size-10 text-destructive/70"
        aria-hidden="true"
      />

      <h2 className="mt-4 text-base font-semibold">Can&apos;t reach the server</h2>

      <p className="mt-2 max-w-md text-sm text-muted-foreground">
        {message ??
          "The recommendation API didn't respond. Check that the backend is running, then try again."}
      </p>

      <Button
        variant="outline"
        className="mt-6"
        onClick={() => window.location.reload()}
      >
        Retry
      </Button>
    </div>
  );
}