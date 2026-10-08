/**
 * @author aliasgarbootwala@gmail.com
 *
 * Presentation layer over the scored pipeline results.
 *
 * Every function here is pure and reads the numbers Mongo produced — it never
 * re-derives a score, because a breakdown that disagreed with the ranking would
 * be worse than no breakdown at all.
 */
import { LeadTier } from "../constants/enums.js";
import { MAX_WHY_MATCHED_REASONS, SKILL_OVERLAP_PERCENT_DECIMALS, TIER_A_MIN_SCORE, TIER_B_MIN_SCORE, WHY_LEAD_QUALITY_THRESHOLD, WHY_SKILL_SCORE_THRESHOLD, WHY_TITLE_SCORE_THRESHOLD, } from "../constants/scoring.constants.js";
const REASON_RULES = [
    {
        applies: (lead) => lead.scoreBreakdown.titleMatch >= WHY_TITLE_SCORE_THRESHOLD,
        describe: () => "Title matches your profile",
    },
    {
        applies: (lead) => lead.scoreBreakdown.salaryFit >= 1,
        describe: () => "Salary suits your experience level",
    },
    {
        applies: (lead) => lead.scoreBreakdown.skillMatch >= WHY_SKILL_SCORE_THRESHOLD,
        describe: (lead) => {
            const percent = Math.round(lead.scoreBreakdown.skillMatch *
                100 *
                10 ** SKILL_OVERLAP_PERCENT_DECIMALS) / 10 ** SKILL_OVERLAP_PERCENT_DECIMALS;
            return `${percent}% skill overlap`;
        },
    },
    {
        applies: (lead) => lead.remoteAllowed === 1,
        describe: () => "Remote-friendly",
    },
    {
        applies: (lead) => lead.scoreBreakdown.leadQuality >= WHY_LEAD_QUALITY_THRESHOLD,
        describe: () => "High engagement",
    },
];
/**
 * Human-readable reasons this lead was recommended.
 *
 * Returns an empty array rather than a filler when nothing clears its
 * threshold. A lead with no stated reason is a weak signal in itself, and
 * inventing one would tell the user nothing they could not already infer from
 * the lead not being filtered out.
 */
export function buildWhyMatched(lead) {
    return REASON_RULES.filter((rule) => rule.applies(lead))
        .map((rule) => rule.describe(lead))
        .slice(0, MAX_WHY_MATCHED_REASONS);
}
/**
 * Rank bucket from `finalScore`.
 *
 * A and B cut at 0.8 and 0.6; everything else is C. There is no fourth bucket
 * for a genuinely poor lead — the hard filters should have removed those
 * already, so a C means a preference was derived too narrowly.
 */
export function resolveTier(finalScore) {
    if (finalScore >= TIER_A_MIN_SCORE) {
        return LeadTier.A;
    }
    if (finalScore >= TIER_B_MIN_SCORE) {
        return LeadTier.B;
    }
    return LeadTier.C;
}
/**
 * Attach `whyMatched` and `tier` to a scored lead.
 *
 * Pure and non-mutating — the input comes straight from the aggregation and
 * should not be written back into.
 */
export function enrichLead(lead) {
    return {
        ...lead,
        whyMatched: buildWhyMatched(lead),
        tier: resolveTier(lead.scoreBreakdown.finalScore),
    };
}
/** Enrich a page of results, preserving pipeline order. */
export function enrichLeads(leads) {
    return leads.map(enrichLead);
}
