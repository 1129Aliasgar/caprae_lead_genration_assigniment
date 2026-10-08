import { Search } from "lucide-react";
import { APP_ROUTES } from "@/lib/constants";

export const metadata = {
  title: "Not found",
};

/**
 * Global not-found page.
 *
 * The lead detail route uses this for both "no such lead" and "does not match
 * you" — the backend returns 404 for either, on purpose, so a lead the user
 * would never have been shown cannot be discovered by guessing ids. The copy
 * reflects that ambiguity rather than claiming the lead doesn't exist.
 */
export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-4 text-center">
      <Search className="size-10 text-muted-foreground/60" aria-hidden="true" />

      <h1 className="mt-4 text-xl font-semibold">Lead not found</h1>

      <p className="mt-2 text-sm text-muted-foreground">
        This lead doesn&apos;t exist, or it doesn&apos;t match your profile
        either — we don&apos;t distinguish the two, so nothing here can be used
        to probe for leads outside your results.
      </p>

      <a
        href={APP_ROUTES.leads}
        className="mt-6 text-sm font-medium underline underline-offset-4"
      >
        Back to your leads
      </a>
    </main>
  );
}