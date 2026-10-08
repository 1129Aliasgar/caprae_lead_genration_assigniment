/**
 * @author aliasgarbootwala@gmail.com
 *
 * Tunables for the Tier-1 resume extractor.
 *
 * Grouped by the extraction field they govern so a threshold change is a
 * one-line edit with the reason next to it.
 */
/** Bumped whenever the extraction rules change enough to alter output. */
export const EXTRACTOR_VERSION = "tier1-v2";
/** Shortest resume worth parsing. Shorter input is a user error. */
export const MIN_RESUME_LENGTH = 40;
/**
 * Confidence cutoffs for skill extraction.
 *
 * A resume naming four technologies is thin evidence; twelve is a skills
 * section. Three is the floor for "medium" — below that the list is more
 * likely noise than a real inventory.
 */
export const SKILL_CONFIDENCE_HIGH_COUNT = 8;
export const SKILL_CONFIDENCE_MEDIUM_COUNT = 3;
/**
 * Education keywords at or below this length are treated as vague.
 *
 * "Master of Science" (16) is a named degree; "graduate" (8) is not, and only
 * says someone finished something. See `scoreEducationConfidence`.
 */
export const VAGUE_EDUCATION_KEYWORD_MAX_LENGTH = 9;
/** Two independent title mentions is a pattern, not a coincidence. */
export const TITLE_CONFIDENCE_HIGH_COUNT = 2;
export const TITLE_CONFIDENCE_MEDIUM_COUNT = 1;
/**
 * Date-range evidence thresholds.
 *
 * `high` at two, not three. Most resumes list two or three employers; three
 * years of a career in two cleanly dated blocks is strong evidence that the
 * parser read the page correctly, and requiring a third would mark almost
 * every mid-career resume as merely medium.
 *
 * Thresholds count ranges *found*, not disjoint periods after merging — three
 * overlapping blocks at one company are still three independent readings of
 * the date format.
 */
export const EXPERIENCE_CONFIDENCE_HIGH_RANGE_COUNT = 2;
export const EXPERIENCE_CONFIDENCE_MEDIUM_RANGE_COUNT = 1;
/**
 * Ignore experience ranges shorter than a year.
 *
 * A single internship or a two-month contract contributes noise to a
 * "years of experience" number a user is about to be shown and asked to
 * confirm.
 */
export const MIN_EXPERIENCE_MONTHS = 12;
/**
 * Plausibility ceiling. A resume that sums to 60 years has almost certainly
 * mis-parsed a range (a typo'd year, an education block read as employment).
 */
export const MAX_PLAUSIBLE_EXPERIENCE_YEARS = 45;
/** Experience reported for any single employer, as a sanity ceiling. */
export const MAX_REASONABLE_SINGLE_EMPLOYMENT_YEARS = 40;
/** Month-name stems, longest first so "jan" cannot shadow "january". */
export const MONTH_PATTERN = "(?:january|jan|february|feb|march|mar|april|apr|may|june|jun|july|jul|" +
    "august|aug|september|sept|sep|october|oct|november|nov|december|dec)";
/**
 * Open-ended range tails. Treated as "still ongoing", resolved to the current
 * month at extraction time.
 */
export const PRESENT_TOKENS = "present|current|now|ongoing|to date|until now";
/**
 * Separator between the two ends of a range. Covers hyphen, en dash, em dash,
 * the word "to", and "until" — all seen in real resumes.
 */
export const RANGE_SEPARATOR_PATTERN = "\\s*(?:-|–|—|to|until)\\s*";
/**
 * A date range, in any of the four shapes resumes use:
 *
 *   "2020 - 2023"year only
 *   "Jan 2020 - Mar 2023"            month and year
 *   "01/2020 - 03/2021"              numeric month
 *   "Jan 2020 - Present"             open ended
 *
 * Captures, in ordinal order — `startMonthWord?`, `startMonthNumber?`,
 * `startYear`, `endMonthWord?`, `endMonthNumber?`, `endYear`. The final
 * capture also takes the present tokens, so one branch covers both the closed
 * and open-ended case.
 *
 * The capture ordinals are load-bearing: `parseDateRanges` destructures the
 * match positionally. `MONTH_PATTERN` must stay non-capturing — a group inside
 * it would shift every index after it and silently parse the wrong fields.
 */
export const DATE_RANGE_SOURCE = "(?:" +
    `\\b(${MONTH_PATTERN})[a-z]*[.,]?\\s+` +
    "|\\b(\\d{1,2})[/.]\\s*" +
    ")?\\b(\\d{4})\\b" +
    RANGE_SEPARATOR_PATTERN +
    "(?:" +
    `\\b(${MONTH_PATTERN})[a-z]*[.,]?\\s+` +
    "|\\b(\\d{1,2})[/.]\\s*" +
    ")?\\b(\\d{4}|" +
    PRESENT_TOKENS +
    ")\\b";
/**
 * Words that introduce an education section.
 *
 * Used only to narrow the search window: a bare "B.S." elsewhere on the page
 * is likelier to be a certification than a degree, but "Education: B.S. in
 * Computer Science" is not.
 */
export const EDUCATION_SECTION_PATTERN = "\\b(education|academic background|academic qualifications|qualifications|" +
    "degrees?|academic profile)\\b\\s*[:\\-–]?";
/** Longest summary sentence kept from the resume. */
export const MAX_SUMMARY_SENTENCE_LENGTH = 240;
/**
 * Longest accepted `resumeText`, in characters.
 *
 * Set to roughly a third of the 64kb body limit (`routes.constants.ts`). A
 * pasted resume is normally 20-40kb of text, so the ceiling leaves headroom
 * for a long one without letting the endpoint become a way to make the server
 * run regexes across an arbitrarily large payload.
 */
export const MAX_RESUME_LENGTH = 20_000;
/*
 * Bounds for `PATCH /api/v1/profile`, where a user corrects what extraction
 * inferred. These are not extraction thresholds — they exist so a hand-edited
 * profile cannot become an unbounded input to the aggregation.
 */
/**
 * Ceiling on a user-supplied years-of-experience figure.
 *
 * The same bound extraction applies to its own reading of the resume. A user
 * typing a larger number is not more credible than the model that just declined
 * to produce one, and the value sets the salary floor, so it is worth bounding
 * on the way in.
 */
export const MAX_PROFILE_YEARS = 45;
/**
 * Most entries allowed in an edited `titles`, `skills` or `locations` list.
 *
 * Skill overlap is scored as a *fraction* of the user's skills found in a
 * posting, so a 400-item skills list would not inflate any individual score —
 * but it would make every regex in the `$match` stage run 400 times per
 * document against 33k leads. Bounded here rather than in the engine so the
 * limit is visible at the API boundary.
 */
export const MAX_PROFILE_LIST_ITEMS = 50;
/** Longest single entry in an edited list, in characters. */
export const MAX_PROFILE_ITEM_LENGTH = 80;
/** Longest profile summary. */
export const MAX_PROFILE_SUMMARY_LENGTH = 240;
