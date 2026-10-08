import { getServerToken } from "@/lib/serverAuth";
import { serverGetRecommendations } from "@/lib/serverApi";
import { LeadList } from "@/components/leads/LeadList";
import {
  BackendUnreachableState,
  ProfileIncompleteState,
} from "@/components/leads/EmptyState";
import { MAX_TOP_N } from "@/lib/constants";

export const metadata = {
  title: "Your leads",
};

/**
 * Ranked leads, fetched server-side.
 *
 * No `dynamic` export: the `cookies()` read in `serverAuth` and the
 * `cache: "no-store"` fetch in `serverApi` already opt this route into
 * per-request rendering. That is what we want regardless — a ranking is
 * user-specific, and caching one would show a user another's leads.
 */
export default async function LeadsPage() {
  const token = await getServerToken();

  const { ok, status, message, leads } = await serverGetRecommendations(
    token,
    MAX_TOP_N,
  );

  /*
   * Two distinct empty states, because the two causes need two different fixes
   * and lumping them together sends people to adjust something already correct.
   */
  if (!ok) {
    if (status === 400 && /profile|paste your resume/i.test(message ?? "")) {
      return <ProfileIncompleteState message={message} />;
    }

    if (status === 401) {
      /*
       * The cookie exists but the backend rejected it — expired or revoked
       * between page load and this request. The shell layout has already run,
       * so this renders inside the app frame; the user needs to sign in again.
       */
      return <ProfileIncompleteState message="Your session has expired. Please sign in again." />;
    }

    return <BackendUnreachableState message={message} />;
  }

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold">Your leads</h1>
        <p className="text-muted-foreground">
          Ranked against your profile. The highest match is first.
        </p>
      </header>

      <LeadList leads={leads} />
    </div>
  );
}