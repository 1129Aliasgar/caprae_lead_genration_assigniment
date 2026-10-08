import { ResumePasteForm } from "@/components/profile/ResumePasteForm";
import { getServerToken } from "@/lib/serverAuth";
import { serverGetAuthProfile } from "@/lib/serverApi";

export const metadata = {
  title: "Your profile",
};

/**
 * Server-rendered because the form needs to know whether a profile already
 * exists, which is only knowable after the request is authenticated.
 *
 * No `dynamic` export: the `cookies()` read in `serverAuth` and the
 * `cache: "no-store"` fetch in `serverApi` already opt this route into
 * per-request rendering — see the same note on the leads page.
 */
export default async function ProfilePage() {
  const token = await getServerToken();
  const user = await serverGetAuthProfile(token);

  /*
   * There is no separate confirmed copy — extraction stores what it found and
   * returns it — so the profile on the user document is what was extracted.
   */
  const profile = user?.profile ?? null;

  /*
   * Presence is `extractedAt`, not a non-empty skills list.
   *
   * Those two disagree in a way that matters now that fields are editable: a
   * user who clears their own skills still has a profile, and gating on
   * `skills.length` would make the whole view vanish and tell them to paste a
   * resume — after they had just deliberately edited one. `extractedAt` is also
   * what the backend's `PATCH` guard checks, so the page and the API now agree
   * on what "has a profile" means.
   */
  const hasProfile = Boolean(profile?.extractedAt);

  return (
    <div className="mx-auto max-w-3xl">
      <header className="mb-8 space-y-2">
        <h1 className="text-3xl font-bold">Your profile</h1>
        <p className="text-muted-foreground">
          {hasProfile
            ? "Paste a new resume to refresh what we're matching you against."
            : "Paste your resume and we'll read it, then rank leads against what we find."}
        </p>
      </header>

      <ResumePasteForm initialProfile={hasProfile ? { profile } : null} />
    </div>
  );
}