import { notFound } from "next/navigation";
import { getServerToken } from "@/lib/serverAuth";
import { serverGetLeadDetail } from "@/lib/serverApi";
import { LeadDetail } from "@/components/leads/LeadDetail";

/**
 * One lead's detail, fetched server-side.
 *
 * `params` is awaited — in Next 16 it is a Promise.
 */
export async function generateMetadata({ params }) {
  const { id } = await params;

  return { title: `Lead ${id}` };
}

export default async function LeadDetailPage({ params }) {
  const { id } = await params;

  const token = await getServerToken();

  const { ok, status, lead } = await serverGetLeadDetail(token, id);

  /*
   * The backend answers 404 both for a lead that does not exist and for one
   * that fails this user's hard filters — deliberately indistinguishable, so a
   * lead the user would never have been shown is not discoverable by guessing
   * ids. `notFound()` renders the same page for both.
   */
  if (!ok || !lead) {
    if (status === 404) {
      notFound();
    }

    /*
     * Anything else — a 400 from a malformed id, a 500, an unreachable
     * backend — is a server problem rather than a missing resource, so it
     * renders an inline notice instead of a 404.
     */
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-center">
        <h1 className="text-base font-semibold">Couldn&apos;t load this lead</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          The server returned an error. Check that it&apos;s running, then try
          again.
        </p>
      </div>
    );
  }

  return <LeadDetail lead={lead} />;
}