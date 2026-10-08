/**
 * @author aliasgarbootwala@gmail.com
 *
 * Types for the recommendation pipeline.
 *
 * `PipelineStage` is mongoose's own union of aggregation stages, re-exported so
 * pipeline builders can be typed without every consumer importing mongoose. It
 * is a discriminated union of *known* stages, so `$match` and `$addFields` are
 * checked against the driver's own definitions.
 *
 * The one concession to looseness: `$addFields` expressions are assembled
 * dynamically, and the driver's expression types are narrow enough that a
 * computed `$cond` tree would need a cast at every level. Those expressions are
 * built as `Record<string, unknown>` and cast back to `PipelineStage` at the
 * return, which keeps the looseness in a few known places rather than spread
 * through the builders.
 */

import type { PipelineStage } from "mongoose";
import type { EducationLevel, LeadTier } from "../constants/enums.js";
import type { UserProfile } from "./profile.types.js";

export type { PipelineStage };

/**
 * Per-dimension scores behind a single recommendation.
 *
 * Returned to the client verbatim. A ranking the user cannot interrogate is a
 * ranking they will not trust, so every lead ships with the numbers that put
 * it where it is.
 */
export interface ScoreBreakdown {
  titleMatch: number;
  skillMatch: number;
  salaryFit: number;
  locationFit: number;
  experienceFit: number;
  leadQuality: number;
  /** Weighted sum of the six above, 0..1. */
  finalScore: number;
}

/** A lead after the pipeline, before enrichment. */
export interface ScoredLead {
  jobId: number;
  title: string;
  description: string;
  skillsDesc: string;
  companyId: number;
  minSalary: number;
  maxSalary: number;
  payPeriod: string;
  currency: string;
  formattedWorkType: string;
  formattedExperienceLevel: string;
  location: string;
  remoteAllowed: number;
  views: number;
  applies: number;
  jobPostingUrl: string;
  applicationUrl: string;
  listedTime: number;
  expiry: number;
  salaryMidpoint: number;
  leadQualityScore: number;
  normalizedLocation: string;
  scoreBreakdown: ScoreBreakdown;
}

/** A scored lead plus the human-readable layer the UI renders. */
export interface RankedLead extends ScoredLead {
  whyMatched: string[];
  tier: LeadTier;
}

/** The six dimension weights. Fixed for every user — see `DEFAULT_WEIGHTS`. */
export interface ScoringWeights {
  titleMatch: number;
  skillMatch: number;
  salaryFit: number;
  locationFit: number;
  experienceFit: number;
  leadQuality: number;
}

/**
 * Everything the pipeline needs: the user's extracted profile, the fixed
 * weights, and how many leads to return.
 */
export interface MatchingContext {
  profile: UserProfile;
  weights: ScoringWeights;
  topN: number;
}

export interface GetRecommendationsInput {
  userId: string;
  topN?: number;
}

export interface GetLeadDetailInput {
  userId: string;
  leadId: string;
}

/**
 * The fields a user may correct, and nothing else.
 *
 * `confidence`, `extractorVersion` and `extractedAt` are absent by design: they
 * are the backend's own account of what it did, and a client that could write
 * them could mark a bad extraction as authoritative. `summary` is absent
 * because it is the extractor's reading of the resume text and is not editable
 * in the UI.
 *
 * Every key optional — this is a partial update, and the service applies only
 * what was sent.
 */
export interface UpdateProfileInput {
  titles?: string[];
  skills?: string[];
  locations?: string[];
  yearsOfExperience?: number;
  educationLevel?: EducationLevel;
}

export interface RecommendationServiceInterface {
  getRecommendations(input: GetRecommendationsInput): Promise<RankedLead[]>;
  getLeadDetail(input: GetLeadDetailInput): Promise<RankedLead>;
}