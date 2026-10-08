/**
 * @author aliasgarbootwala@gmail.com
 *
 * Assembles the MongoDB aggregation pipeline that ranks leads for a user.
 *
 * Two stages, and the split matters:
 *
 *   1. Hard filters ($match) — keep only leads that are *eligible*.
 *   2. Weighted scoring ($addFields / $sort / $limit / $project) — among
 *      eligible leads, how well does each suit this person?
 *
 * Everything is derived from the user's extracted profile. There are no
 * stored preferences, so the profile's own fields are the input: titles become
 * target titles, locations become preferred locations, and years of experience
 * implies a seniority level and an expected salary band.
 *
 * Everything stays in Mongo rather than being computed in Node so the database
 * does the ranking, sorting and truncation: only `topN` documents cross the wire.
 */
import { ExperienceLevel, WeightType } from "../constants/enums.js";
import { DEFAULT_WEIGHTS } from "../constants/recommendation.constants.js";
import { EXPERIENCE_SCORE_FALLBACK, EXPERIENCE_SCORE_MATCH, LEAD_QUALITY_SCORE_NO_VIEWS, LOCATION_SCORE_FALLBACK, LOCATION_SCORE_PREFERRED, LOCATION_SCORE_REMOTE, SALARY_SCORE_FALLBACK, SALARY_SCORE_MATCH, TITLE_SCORE_EXACT, TITLE_SCORE_FALLBACK, TITLE_SCORE_PARTIAL, } from "../constants/scoring.constants.js";
import { escapeRegExp } from "./textMatching.js";
/** Every weighting dimension, in the order they are summed. */
const WEIGHT_KEYS = [
    WeightType.TITLE_MATCH,
    WeightType.SKILL_MATCH,
    WeightType.SALARY_FIT,
    WeightType.LOCATION_FIT,
    WeightType.EXPERIENCE_FIT,
    WeightType.LEAD_QUALITY,
];
/**
 * Salary floor per seniority band, in whole currency units per year.
 *
 * Without a user-set salary range there is still a signal available: someone
 * with a decade of experience is unlikely to be well served by a role paying
 * $40k. These floors are the minimum a match should clear; they are
 * deliberately conservative so the filter removes clear mismatches rather than
 * taking a position on what someone is worth.
 */
const SALARY_FLOOR_BY_LEVEL = {
    [ExperienceLevel.INTERNSHIP]: 0,
    [ExperienceLevel.ENTRY_LEVEL]: 40_000,
    [ExperienceLevel.MID_SENIOR_LEVEL]: 70_000,
    [ExperienceLevel.SENIOR_LEVEL]: 100_000,
    [ExperienceLevel.DIRECTOR]: 130_000,
    [ExperienceLevel.EXECUTIVE]: 150_000,
};
/** Years of experience at or above which each band applies. */
const YEARS_BY_LEVEL = [
    [ExperienceLevel.EXECUTIVE, 15],
    [ExperienceLevel.DIRECTOR, 10],
    [ExperienceLevel.SENIOR_LEVEL, 6],
    [ExperienceLevel.MID_SENIOR_LEVEL, 3],
    [ExperienceLevel.ENTRY_LEVEL, 1],
    [ExperienceLevel.INTERNSHIP, 0],
];
/**
 * Case-insensitive RegExp matching `value` anywhere in a field.
 *
 * Returns a real `RegExp`, not a source string: inside `$match`,
 * `$in: ["backend engineer"]` is an exact string equality test, not a
 * pattern. Passing a source string there matches nothing at all and silently
 * excludes every lead.
 */
function literalPattern(value) {
    return new RegExp(escapeRegExp(value.trim()), "i");
}
/**
 * Case-insensitive RegExp anchored to the start of the field value.
 *
 * Whitespace is collapsed to `\s+` so "Senior Backend Engineer" still matches
 * a lead titled "Senior  Backend  Engineer".
 */
function anchoredPattern(value) {
    const collapsed = value.trim().replace(/\s+/g, "\\s+");
    return new RegExp(`^${escapeRegExp(collapsed)}$`, "i");
}
/**
 * Location matcher: the place, optionally followed by a region suffix.
 *
 * The dataset stores locations as `new york, ny` and `chicago, il`, while a
 * resume says "New York" or "Chicago". A plain `^new york$` therefore never
 * matches, and the location hard filter silently returns zero leads for anyone
 * whose resume is more specific than the dataset's own formatting — the profile
 * looks fine on screen while the list is empty.
 *
 * The optional `(?:,\s*.+)?$` tail accepts the region without demanding one, so
 * the pattern still matches the bare form. Kept separate from `anchoredPattern`
 * because this tolerance is specific to how locations are stored; applying it
 * to titles would make "Engineer" match "Senior Engineer".
 */
function locationPattern(value) {
    const collapsed = value.trim().replace(/\s+/g, "\\s+");
    return new RegExp(`^${escapeRegExp(collapsed)}(?:,\\s*\\S.*)?$`, "i");
}
/**
 * Place names too broad to constrain anything.
 *
 * This dataset is entirely US postings, and the extractor reads a country line
 * on most resumes ("Chicago, IL — United States"). Treating `united states` as
 * a literal location would restrict results to the 535 leads that happen to be
 * labelled exactly that, discarding every lead filed under a city or a state —
 * the opposite of what the person meant. A country names the dataset, not a
 * preference, so it is dropped rather than matched.
 */
const BROAD_LOCATION_TOKENS = new Set([
    "united states",
    "united states of america",
    "usa",
    "u.s.",
    "u.s.a.",
    "us",
    "america",
]);
/** Locations specific enough to filter on, with `remote` handled separately. */
function specificLocations(locations) {
    return locations.filter((location) => !BROAD_LOCATION_TOKENS.has(location));
}
/** Lowercased, de-duplicated, non-empty list. */
function normalizeTerms(values) {
    const seen = new Set();
    for (const value of values) {
        const trimmed = value.trim().toLowerCase();
        if (trimmed.length > 0) {
            seen.add(trimmed);
        }
    }
    return [...seen];
}
/** Location value the extractor emits for "wants remote work". */
const REMOTE_TOKEN = "remote";
/**
 * Seniority implied by years of experience.
 *
 * Returned as one of the dataset's own `formattedExperienceLevel` values, so it
 * can be pushed into the hard filter without a translation table.
 */
export function deriveExperienceLevel(years) {
    for (const [level, threshold] of YEARS_BY_LEVEL) {
        if (years >= threshold) {
            return level;
        }
    }
    return ExperienceLevel.ENTRY_LEVEL;
}
/** Minimum plausible salary for that band. */
function salaryFloorFor(level) {
    return SALARY_FLOOR_BY_LEVEL[level] ?? 0;
}
/**
 * Hard filters, derived entirely from the profile.
 *
 * Every clause is conditional. A profile with no titles or no locations simply
 * omits that filter rather than emitting an empty one — `$in: []` matches
 * nothing in Mongo, so an empty clause would return zero results with no
 * explanation.
 */
function buildHardFilterStage(context) {
    const { profile } = context;
    const targetTitles = normalizeTerms(profile.titles ?? []);
    const locations = normalizeTerms(profile.locations ?? []);
    /*
     * A profile mentioning "remote" is expressing a preference for remote work,
     * so that becomes a hard filter. Locations listed alongside it still matter
     * for scoring, but the remote flag is the stronger signal.
     */
    const wantsRemote = locations.includes(REMOTE_TOKEN);
    const placeLocations = specificLocations(locations.filter((location) => location !== REMOTE_TOKEN));
    const clauses = [];
    if (targetTitles.length > 0) {
        clauses.push({ title: { $in: targetTitles.map(literalPattern) } });
    }
    if (wantsRemote) {
        clauses.push({ remoteAllowed: 1 });
    }
    else if (placeLocations.length > 0) {
        clauses.push({
            $or: [
                {
                    normalizedLocation: {
                        $in: placeLocations.map(locationPattern),
                    },
                },
                { normalizedLocation: { $regex: literalPattern(REMOTE_TOKEN) } },
            ],
        });
    }
    /*
     * Salary floor for the implied seniority.
     *
     * Expressed as `$nor` — "exclude leads that demonstrably cannot clear the
     * floor" — because the complement of a range comparison is a disjunction and
     * negation cannot be applied inline. Leads with no salary data
     * (`maxSalary: 0`) are deliberately not excluded: an under-reported posting
     * is still a real lead, and hiding it would be worse than scoring it down.
     */
    const salaryFloor = salaryFloorFor(deriveExperienceLevel(profile.yearsOfExperience ?? 0));
    if (salaryFloor > 0) {
        clauses.push({
            $nor: [{ maxSalary: { $gt: 0, $lt: salaryFloor } }],
        });
    }
    /*
     * `$match: {}` for an unconstrained profile is valid and matches everything,
     * so there is no need to special-case the empty case.
     */
    return { $match: clauses.length === 1 ? clauses[0] : { $and: clauses } };
}
/** The six dimension scores, in `$cond` order. */
function buildScoringStage(context) {
    const { profile } = context;
    const targetTitles = normalizeTerms(profile.titles ?? []);
    const userSkills = normalizeTerms(profile.skills ?? []);
    const locations = normalizeTerms(profile.locations ?? []);
    const hasTargetTitles = targetTitles.length > 0;
    const hasUserSkills = userSkills.length > 0;
    const wantsRemote = locations.includes(REMOTE_TOKEN);
    const placeLocations = specificLocations(locations.filter((location) => location !== REMOTE_TOKEN));
    const experienceLevel = deriveExperienceLevel(profile.yearsOfExperience ?? 0);
    const salaryFloor = salaryFloorFor(experienceLevel);
    /*
     * Locations a lead may be in and still count as a match. Remote is always
     * acceptable — a remote lead satisfies any location preference outright.
     */
    const acceptableLocations = [...placeLocations, REMOTE_TOKEN];
    return {
        $addFields: {
            /*
             * titleScore: 1.0 exact, 0.7 partial, 0.2 otherwise.
             *
             * Exact is anchored equality, so "Engineer" does not score 1.0 against
             * "Senior Backend Engineer" — the partial test is what catches that,
             * which is the point of having both.
             *
             * `$regexMatch`, not `{ title: { $regex } }`: the query form is
             * `$match`-only and Mongo rejects it inside a scoring expression with
             * "Unrecognized expression '$regex'".
             */
            titleScore: {
                $cond: [
                    hasTargetTitles
                        ? {
                            $or: targetTitles.map((title) => ({
                                $regexMatch: {
                                    input: "$title",
                                    regex: anchoredPattern(title).source,
                                    options: "i",
                                },
                            })),
                        }
                        : false,
                    TITLE_SCORE_EXACT,
                    {
                        $cond: [
                            hasTargetTitles
                                ? {
                                    $or: targetTitles.map((title) => ({
                                        $regexMatch: {
                                            input: "$title",
                                            regex: literalPattern(title).source,
                                            options: "i",
                                        },
                                    })),
                                }
                                : false,
                            TITLE_SCORE_PARTIAL,
                            TITLE_SCORE_FALLBACK,
                        ],
                    },
                ],
            },
            /*
             * skillScore: the fraction of the user's skills this lead mentions.
             *
             * `$setIntersection` against `JobLead.skills` — the token array the seed
             * builds from `skills_desc`, canonicalised through the same alias table
             * the extractor uses. Without that shared canonicalisation the
             * intersection is empty and every lead scores 0 on skills.
             *
             * The `$size` guard is not defensive noise: a profile with no skills has
             * an empty array, and 0/0 in an aggregation yields `NaN`, which Mongo
             * drops from the sort order entirely — those leads would vanish rather
             * than score zero.
             */
            skillScore: {
                $cond: [
                    hasUserSkills,
                    {
                        $divide: [
                            {
                                $size: {
                                    $setIntersection: [userSkills, { $ifNull: ["$skills", []] }],
                                },
                            },
                            userSkills.length,
                        ],
                    },
                    0,
                ],
            },
            /*
             * salaryScore: does the lead clear the floor implied by the user's
             * seniority? A lead below it still gets a floor score rather than zero —
             * it qualified, it just does not pay what the seniority implies.
             */
            salaryScore: {
                $cond: [
                    salaryFloor > 0
                        ? { $gte: ["$salaryMidpoint", salaryFloor] }
                        : false,
                    SALARY_SCORE_MATCH,
                    SALARY_SCORE_FALLBACK,
                ],
            },
            /*
             * locationScore. Remote is the maximum, because a remote lead satisfies
             * a location preference outright rather than approximately.
             *
             * Three tests, because the stored location is not always the same shape
             * as the profile's:
             *
             *   1. exact equality on the normalised field — cheap, and the common case
             *   2. exact equality on the raw field lowercased — catches a normalised
             *      value that has drifted (whitespace collapse)
             *   3. an anchored regex over both — catches "san francisco bay area"
             *      against a lead reading "san francisco, ca"
             */
            locationScore: {
                $cond: [
                    { $eq: ["$remoteAllowed", 1] },
                    LOCATION_SCORE_REMOTE,
                    {
                        $cond: [
                            {
                                $or: [
                                    {
                                        $in: [
                                            { $toLower: "$normalizedLocation" },
                                            acceptableLocations,
                                        ],
                                    },
                                    {
                                        $in: [
                                            { $toLower: { $ifNull: ["$location", ""] } },
                                            acceptableLocations,
                                        ],
                                    },
                                    ...acceptableLocations.flatMap((location) => [
                                        {
                                            $regexMatch: {
                                                input: "$normalizedLocation",
                                                regex: locationPattern(location).source,
                                                options: "i",
                                            },
                                        },
                                        {
                                            $regexMatch: {
                                                input: { $ifNull: ["$location", ""] },
                                                regex: locationPattern(location).source,
                                                options: "i",
                                            },
                                        },
                                    ]),
                                ],
                            },
                            LOCATION_SCORE_PREFERRED,
                            LOCATION_SCORE_FALLBACK,
                        ],
                    },
                ],
            },
            /*
             * experienceScore: does the lead's stated level match the one implied by
             * the user's years?
             *
             * A level that is *more* senior than the user still counts as a match —
             * stretching upward is a different proposition from being filtered out by
             * a mismatch, and the hard filter already removed leads below the band.
             */
            experienceScore: {
                $cond: [
                    {
                        $in: [
                            "$formattedExperienceLevel",
                            [
                                experienceLevel,
                                ...YEARS_BY_LEVEL
                                    .slice(0, YEARS_BY_LEVEL.findIndex(([level]) => level === experienceLevel))
                                    .map(([level]) => level),
                            ],
                        ],
                    },
                    EXPERIENCE_SCORE_MATCH,
                    EXPERIENCE_SCORE_FALLBACK,
                ],
            },
            /*
             * leadQualityScore from engagement: applies per view, capped at 1.
             *
             * A lead with no views gets the neutral 0.5 — it has not been shown to
             * fail, it simply has no data.
             */
            leadQualityScore: {
                $cond: [
                    { $gt: [{ $ifNull: ["$views", 0] }, 0] },
                    {
                        $min: [
                            1,
                            {
                                $divide: [
                                    { $ifNull: ["$applies", 0] },
                                    { $ifNull: ["$views", 0] },
                                ],
                            },
                        ],
                    },
                    LEAD_QUALITY_SCORE_NO_VIEWS,
                ],
            },
        },
    };
}
/**
 * `finalScore` = the weighted sum of the six dimension scores.
 *
 * The weight keys and the computed field names do not line up —
 * `WeightType.TITLE_MATCH` is `titleMatch` while the scoring stage produces
 * `titleScore` — so the pairing is explicit. Reading one from the other
 * type-checks perfectly and resolves to `null` at runtime, which `$ifNull`
 * turns into 0: every lead scores 0.000 and the apparent ordering comes from
 * the `jobId` tiebreak.
 */
const WEIGHT_TO_SCORE_FIELD = {
    [WeightType.TITLE_MATCH]: "titleScore",
    [WeightType.SKILL_MATCH]: "skillScore",
    [WeightType.SALARY_FIT]: "salaryScore",
    [WeightType.LOCATION_FIT]: "locationScore",
    [WeightType.EXPERIENCE_FIT]: "experienceScore",
    [WeightType.LEAD_QUALITY]: "leadQualityScore",
};
function buildFinalScoreStage(weights) {
    const contributions = WEIGHT_KEYS.map((key) => ({
        $multiply: [weights[key], { $ifNull: [`$${WEIGHT_TO_SCORE_FIELD[key]}`, 0] }],
    }));
    return {
        $addFields: {
            finalScore: { $add: contributions },
        },
    };
}
/**
 * Flatten the six scores into the `scoreBreakdown` the API returns.
 *
 * Done in `$project` rather than in `enrichment.helper.ts` so the numbers shown
 * are literally the ones that were sorted on, not a re-derivation.
 */
function buildProjectionStage() {
    return {
        $project: {
            _id: 0,
            jobId: 1,
            title: 1,
            description: 1,
            skillsDesc: 1,
            companyId: 1,
            minSalary: 1,
            maxSalary: 1,
            payPeriod: 1,
            currency: 1,
            formattedWorkType: 1,
            formattedExperienceLevel: 1,
            location: 1,
            remoteAllowed: 1,
            views: 1,
            applies: 1,
            jobPostingUrl: 1,
            applicationUrl: 1,
            listedTime: 1,
            expiry: 1,
            salaryMidpoint: 1,
            leadQualityScore: 1,
            normalizedLocation: 1,
            scoreBreakdown: {
                titleMatch: "$titleScore",
                skillMatch: "$skillScore",
                salaryFit: "$salaryScore",
                locationFit: "$locationScore",
                experienceFit: "$experienceScore",
                leadQuality: "$leadQualityScore",
                finalScore: "$finalScore",
            },
        },
    };
}
/**
 * The full ranked pipeline.
 *
 * `topN` is applied in Mongo, not in Node, so asking for 20 results transfers
 * 20 documents rather than every eligible lead. `jobId` breaks ties: without a
 * deterministic secondary sort, Mongo is free to return equal-scoring leads in
 * any order, which makes pagination unstable.
 */
export function buildRecommendationPipeline(context) {
    return [
        buildHardFilterStage(context),
        buildScoringStage(context),
        buildFinalScoreStage(context.weights),
        { $sort: { finalScore: -1, jobId: 1 } },
        { $limit: context.topN },
        buildProjectionStage(),
    ];
}
/**
 * The same pipeline, unlimited, for the single-lead detail view.
 *
 * The detail endpoint returns one lead, but it must still be *the lead this
 * user would have been shown* — so it is ranked by the same rules rather than
 * fetched by id alone. `topN` is deliberately dropped: a lead ranked 40th is
 * still the right answer when asked for directly, but it would be unreachable
 * behind a `$limit: 20`.
 */
export function buildLeadDetailPipeline(context, leadId) {
    return [
        buildHardFilterStage(context),
        buildScoringStage(context),
        buildFinalScoreStage(context.weights),
        { $sort: { finalScore: -1, jobId: 1 } },
        /*
         * The id filter goes *after* the sort so the requested lead is found
         * wherever it ranked, but before the projection so only one document is
         * shaped.
         */
        { $match: { jobId: leadId } },
        { $limit: 1 },
        buildProjectionStage(),
    ];
}
/**
 * The shipped weights, fixed for every user.
 *
 * No normalisation is needed here: `DEFAULT_WEIGHTS` already sums to 1.0, and
 * there is no longer a user-supplied value that could break the scale.
 */
export function resolveWeights() {
    return DEFAULT_WEIGHTS;
}
/**
 * Assemble the pipeline context from a user's stored profile.
 *
 * Kept beside the pipeline builders so the derived values — seniority,
 * salary floor — live with the stages that consume them rather than being
 * recomputed by the service.
 */
export function buildMatchingContext(input) {
    return {
        profile: input.profile,
        weights: resolveWeights(),
        topN: input.topN,
    };
}
