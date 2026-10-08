"use client";

/**
 * One lead in full, with the score breakdown beside the description.
 *
 * The breakdown is in the sidebar rather than below the description because it
 * answers "why am I looking at this?" — it should be visible before someone
 * reads several hundred words of job posting.
 */

import Link from "next/link";
import {
  ArrowLeft,
  Briefcase,
  Building2,
  Calendar,
  ExternalLink,
  MapPin,
  Users,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { TierBadge } from "./TierBadge";
import { ScoreBreakdown } from "./ScoreBreakdown";
import { WhyMatchedBadges } from "./WhyMatchedBadges";
import { APP_ROUTES } from "@/lib/constants";

/** Epoch milliseconds to a readable date, guarding against a missing value. */
function formatDate(epochMs) {
  if (!epochMs || epochMs <= 0) return null;

  return new Date(epochMs).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatSalary(lead) {
  if (lead.minSalary > 0 && lead.maxSalary > 0) {
    return `${lead.minSalary.toLocaleString()} – ${lead.maxSalary.toLocaleString()}${
      lead.currency ? ` ${lead.currency}` : ""
    }${lead.payPeriod ? ` per ${lead.payPeriod.toLowerCase().replace("_", " ")}` : ""}`;
  }

  if (lead.salaryMidpoint > 0) {
    return `Around ${lead.salaryMidpoint.toLocaleString()}${
      lead.currency ? ` ${lead.currency}` : ""
    }`;
  }

  return "Not disclosed in this posting";
}

export function LeadDetail({ lead }) {
  const breakdown = lead.scoreBreakdown ?? {};
  const finalScore = breakdown.finalScore ?? 0;

  const listedDate = formatDate(lead.listedTime);
  const expiryDate = formatDate(lead.expiry);

  const skills = lead.skillsDesc
    ? lead.skillsDesc.split(/[,;/|]/).map((skill) => skill.trim()).filter(Boolean)
    : [];

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link href={APP_ROUTES.leads}>
          <ArrowLeft className="size-4" aria-hidden="true" />
          Back to all leads
        </Link>
      </Button>

      <header className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <h1 className="text-2xl font-bold leading-tight">{lead.title}</h1>

          <TierBadge tier={lead.tier} score={finalScore} />
        </div>

        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <Building2 className="size-3.5" aria-hidden="true" />
            Company #{lead.companyId}
          </span>

          {lead.formattedExperienceLevel ? (
            <span className="flex items-center gap-1.5">
              <Briefcase className="size-3.5" aria-hidden="true" />
              {lead.formattedExperienceLevel}
            </span>
          ) : null}

          {lead.formattedWorkType ? (
            <span className="flex items-center gap-1.5">
              <Users className="size-3.5" aria-hidden="true" />
              {lead.formattedWorkType}
            </span>
          ) : null}

          {lead.remoteAllowed === 1 ? (
            <Badge variant="secondary">Remote friendly</Badge>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-2 pt-1">
          <Button asChild>
            <a
              href={lead.applicationUrl || lead.jobPostingUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              Apply now
              <ExternalLink className="size-4" aria-hidden="true" />
            </a>
          </Button>

          {lead.jobPostingUrl ? (
            <Button asChild variant="outline">
              <a
                href={lead.jobPostingUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                View on LinkedIn
                <ExternalLink className="size-4" aria-hidden="true" />
              </a>
            </Button>
          ) : null}
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="space-y-6">
          <Card>
            <CardContent className="pt-6">
              <h2 className="mb-3 text-base font-semibold">About this role</h2>

              {lead.description ? (
                /*
                  `whitespace-pre-wrap` rather than `prose`: the source
                  description is raw text with hard line breaks from a scraped
                  page, and `prose` would reflow paragraphs that were never
                  paragraphs. Preserving the breaks is the honest rendering.
                */
                <div className="max-h-[32rem] overflow-y-auto whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                  {lead.description}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  This posting has no description text.
                </p>
              )}
            </CardContent>
          </Card>

          {skills.length > 0 ? (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Skills mentioned</CardTitle>
              </CardHeader>

              <CardContent>
                <ul className="flex flex-wrap gap-1.5">
                  {skills.map((skill) => (
                    <li key={skill}>
                      <Badge variant="secondary" className="font-normal">
                        {skill}
                      </Badge>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Posting details</CardTitle>
            </CardHeader>

            <CardContent>
              <dl className="grid gap-3 text-sm sm:grid-cols-2">
                <div className="flex items-start gap-2">
                  <Wallet className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
                  <div>
                    <dt className="text-muted-foreground">Salary</dt>
                    <dd className="font-medium">{formatSalary(lead)}</dd>
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <MapPin className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
                  <div>
                    <dt className="text-muted-foreground">Location</dt>
                    <dd className="font-medium">
                      {lead.location || "Not stated"}
                    </dd>
                  </div>
                </div>

                {listedDate ? (
                  <div className="flex items-start gap-2">
                    <Calendar className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
                    <div>
                      <dt className="text-muted-foreground">Listed</dt>
                      <dd className="font-medium">{listedDate}</dd>
                    </div>
                  </div>
                ) : null}

                {expiryDate ? (
                  <div className="flex items-start gap-2">
                    <Calendar className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
                    <div>
                      <dt className="text-muted-foreground">Expires</dt>
                      <dd className="font-medium">{expiryDate}</dd>
                    </div>
                  </div>
                ) : null}

                <div>
                  <dt className="text-muted-foreground">Engagement</dt>
                  <dd className="font-medium">
                    {lead.views > 0
                      ? `${lead.applies} applications from ${lead.views} views`
                      : "No view data yet"}
                  </dd>
                </div>
              </dl>
            </CardContent>
          </Card>
        </div>

        <aside className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Why this lead</CardTitle>
            </CardHeader>

            <CardContent className="space-y-4">
              <WhyMatchedBadges reasons={lead.whyMatched} />

              <Separator />

              {/*
                This is the transparency surface: the same numbers the
                backend sorted on, shown so the ranking can be inspected rather
                than taken on faith.
              */}
              <ScoreBreakdown scoreBreakdown={breakdown} />
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}