/**
 * @author aliasgarbootwala@gmail.com
 *
 * Thresholds for the recommendation pipeline.
 *
 * Split from the scoring dimension values themselves because a threshold is a
 * *policy* decision ("what counts as a good match?") while a score is a
 * measurement ("how well does this lead match?"). Changing a policy threshold
 * should never require touching how a score is computed.
 */

/** `titleScore` for an exact, case-insensitive match on a target title. */
export const TITLE_SCORE_EXACT = 1;

/** `titleScore` when the target appears in, or the job title contains, it. */
export const TITLE_SCORE_PARTIAL = 0.7;

/** `titleScore` for a lead that passed the hard filter but is not a real match. */
export const TITLE_SCORE_FALLBACK = 0.2;

/** `salaryScore` when the lead's midpoint falls inside the user's range. */
export const SALARY_SCORE_MATCH = 1;

/** `salaryScore` for a lead that passed the overlap filter but not the midpoint test. */
export const SALARY_SCORE_FALLBACK = 0.4;

/** `locationScore` for a remote lead — always the maximum. */
export const LOCATION_SCORE_REMOTE = 1;

/** `locationScore` for a lead in a preferred location. */
export const LOCATION_SCORE_PREFERRED = 0.9;

/** `locationScore` for a lead the filters let through without a location match. */
export const LOCATION_SCORE_FALLBACK = 0.3;

/**
 * `experienceScore` for a lead whose level matches — or exceeds — the level
 * implied by the user's years of experience.
 */
export const EXPERIENCE_SCORE_MATCH = 1;

/** `experienceScore` for a lead at a lower level. */
export const EXPERIENCE_SCORE_FALLBACK = 0.5;

/** Score substituted for `leadQualityScore` when a lead has no view data. */
export const LEAD_QUALITY_SCORE_NO_VIEWS = 0.5;

/*
 * Tier cut-offs on `finalScore`, which is a weighted mean of 0..1 scores and so
 * is itself 0..1.
 */

export const TIER_A_MIN_SCORE = 0.8;
export const TIER_B_MIN_SCORE = 0.6;

/*
 * `whyMatched` cut-offs. These are read off the *dimension* scores, not the
 * final score — a lead can score poorly overall and still be worth explaining
 * one strong dimension on.
 */

/** `titleScore` at or above which a title match is worth mentioning. */
export const WHY_TITLE_SCORE_THRESHOLD = TITLE_SCORE_PARTIAL;

/** `skillScore` at or above which an overlap percentage is worth mentioning. */
export const WHY_SKILL_SCORE_THRESHOLD = 0.6;

/** `leadQualityScore` at or above which engagement is worth mentioning. */
export const WHY_LEAD_QUALITY_THRESHOLD = 0.7;

/**
 * Reasons are shown as a short list, so they are capped. Ordered by how
 * decisive the reason is — a salary mismatch outranks a nice-to-have — so
 * truncation drops the least informative.
 */
export const MAX_WHY_MATCHED_REASONS = 4;

/** Percentage rounded to a whole number in the "X% skill overlap" message. */
export const SKILL_OVERLAP_PERCENT_DECIMALS = 0;