"use client";

/**
 * Global error boundary.
 *
 * A segment-level failure here would otherwise render Next's unstyled default
 * and drop the user out of the app chrome entirely. This keeps the shell and
 * offers a retry, which is the right default for an intermittent failure —
 * a client component throwing on every render will just fail again.
 */

import { useEffect } from "react";

export default function GlobalError({ error, reset }) {
  useEffect(() => {
    /*
     * Server-side rendering errors arrive as an opaque digest rather than a
     * message, so the digest is the only useful thing to surface.
     */
    console.error("Unhandled application error:", error);
  }, [error]);

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-4 text-center">
      <h1 className="text-xl font-semibold">Something went wrong</h1>

      <p className="mt-2 text-sm text-muted-foreground">
        An unexpected error interrupted this page. Retrying usually clears it.
      </p>

      {error?.digest ? (
        <p className="mt-3 font-mono text-xs text-muted-foreground">
          Reference: {error.digest}
        </p>
      ) : null}

      <button
        type="button"
        onClick={reset}
        className="mt-6 rounded-md border border-input px-4 py-2 text-sm font-medium transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        Try again
      </button>
    </main>
  );
}