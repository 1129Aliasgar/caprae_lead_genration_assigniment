"use client";

/**
 * Paste a resume, see what was extracted, correct what is wrong, go to the leads.
 *
 * One screen rather than a wizard. The steps existed to gate a separate
 * confirmed copy of the profile; with a single stored profile there is nothing
 * to confirm, so the review step was three forms guarding a distinction the
 * product no longer makes.
 *
 * What replaced the gate is per-field editing. The extractor is a regex parser,
 * so some of what it reads is wrong, and the two remedies are not equally
 * useful: repasting a resume is a blunt instrument when the user can see
 * exactly which one field is wrong. `ProfileFields` PATCHes that field alone.
 */

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ProfileFields } from "./ProfileFields";
import { extractResume } from "@/lib/api";
import { toastError, toastSuccess } from "@/hooks/useToast";
import { APP_ROUTES, RESUME_LIMITS } from "@/lib/constants";
import { cn } from "cn";

export function ResumePasteForm({ initialProfile = null }) {
  const [resumeText, setResumeText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [profile, setProfile] = useState(initialProfile);

  const router = useRouter();

  const length = resumeText.trim().length;
  const tooShort = length > 0 && length < RESUME_LIMITS.minLength;
  const tooLong = resumeText.length > RESUME_LIMITS.maxLength;
  const canSubmit = length >= RESUME_LIMITS.minLength && !tooLong;

  /**
   * Adopt the server's profile.
   *
   * `router.refresh()` matters as much as the local state: the profile is
   * rendered from a Server Component that fetched it on the server, so without a
   * refresh the page HTML still holds the profile from the previous render.
   * `setProfile` covers what is on screen now; the refresh covers everything
   * derived from it, including the leads page if the user navigates straight
   * there.
   */
  const adoptProfile = (next) => {
    setProfile(next);
    router.refresh();
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (loading || !canSubmit) return;

    setLoading(true);
    setError(null);

    try {
      const res = await extractResume(resumeText.trim());

      /*
       * Extraction replaces the whole profile, so any field the user had
       * corrected by hand is overwritten along with it — the new resume is the
       * source of truth. Replacing local state rather than merging is
       * deliberate: merging would leave corrected values pointing at text the
       * user no longer supplied.
       */
      adoptProfile(res.data.profile);

      setResumeText("");
      toastSuccess("Profile extracted");
    } catch (err) {
      setError(err.message);
      toastError("Extraction failed", err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="resumeText">
                  {profile ? "Replace your resume" : "Your resume"}
                </Label>

                <span
                  className={cn(
                    "text-xs tabular-nums",
                    tooLong ? "text-destructive" : "text-muted-foreground",
                  )}
                >
                  {resumeText.length.toLocaleString()} /{" "}
                  {RESUME_LIMITS.maxLength.toLocaleString()}
                </span>
              </div>

              <textarea
                id="resumeText"
                name="resumeText"
                rows={profile ? 8 : 14}
                value={resumeText}
                onChange={(event) => setResumeText(event.target.value)}
                placeholder={
                  "Paste your resume here — plain text works best.\n\nInclude your job titles with dates, your skills, and your education."
                }
                aria-describedby="resume-help"
                aria-invalid={tooLong}
                disabled={loading}
                className="w-full resize-y rounded-md border border-input bg-background px-3 py-2 font-mono text-sm leading-relaxed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
              />

              <p id="resume-help" className="text-xs text-muted-foreground">
                Parsed with regex and a dictionary — no external service. The
                length limits are the API&apos;s own; matching them here saves a
                round trip. Pasting a new resume replaces everything below,
                including anything you edited.
              </p>
            </div>

            {tooShort && !tooLong ? (
              <p className="text-sm text-muted-foreground">
                Keep going — we need at least {RESUME_LIMITS.minLength}{" "}
                characters to extract anything useful.
              </p>
            ) : null}

            {tooLong ? (
              <p className="flex items-start gap-2 text-sm text-destructive">
                <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                <span>
                  That&apos;s over the{" "}
                  {RESUME_LIMITS.maxLength.toLocaleString()} character limit.
                  Trim the oldest roles first — we need your titles and dates,
                  not your full history.
                </span>
              </p>
            ) : null}

            {error ? (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            ) : null}

            <Button type="submit" disabled={!canSubmit || loading}>
              {loading
                ? "Reading your resume…"
                : profile
                  ? "Replace my profile"
                  : "Extract my profile"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {profile ? (
        <>
          <Separator />

          <section aria-labelledby="extracted-heading" className="space-y-6">
            <div>
              <h2 id="extracted-heading" className="text-lg font-semibold">
                What we read
              </h2>
              <p className="text-sm text-muted-foreground">
                This is what your recommendations are based on. The icon next to
                each field shows how sure the extractor was — anything amber or
                red is worth a look. Fix what&apos;s wrong and your leads
                re-rank.
              </p>
            </div>

            <Card>
              <CardContent className="pt-6">
                <ProfileFields profile={profile} onSaved={adoptProfile} />
              </CardContent>
            </Card>

            <Button asChild>
              <Link href={APP_ROUTES.leads}>See my ranked leads</Link>
            </Button>
          </section>
        </>
      ) : null}
    </div>
  );
}