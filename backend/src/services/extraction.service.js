/**
 * @author aliasgarbootwala@gmail.com
 *
 * Tier-1 resume extraction. No network, no API key, no rate limit.
 *
 * A resume is unstructured text, so nothing here can be trusted implicitly —
 * every field carries its own confidence, and the user can correct any of them
 * through `PATCH /api/v1/profile`. That is the whole mitigation: the ranking
 * reads what is stored, so the remedy for a bad extraction is to fix the field.
 *
 * This replaced an LLM-based extractor, which was removed rather than kept as
 * a fallback. Measured reason: a free-tier chat model timed out at 30 seconds
 * on a 4,877-character resume, while this runs in single-digit milliseconds.
 * Extraction sits directly in front of the user's first real action, so a
 * provider that is slow *or* down is not an acceptable dependency — especially
 * when the deterministic version is better on the field that matters most. On a
 * sales resume the LLM path returned one wrong title and zero correct ones;
 * this returns both.
 */
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { inject, injectable } from "inversify";
import { TYPES } from "../config/types.js";
import { ExtractionConfidence } from "../constants/enums.js";
import { DATE_RANGE_SOURCE, EDUCATION_SECTION_PATTERN, EXTRACTOR_VERSION, EXPERIENCE_CONFIDENCE_HIGH_RANGE_COUNT, EXPERIENCE_CONFIDENCE_MEDIUM_RANGE_COUNT, MAX_PLAUSIBLE_EXPERIENCE_YEARS, MAX_REASONABLE_SINGLE_EMPLOYMENT_YEARS, MAX_SUMMARY_SENTENCE_LENGTH, MIN_EXPERIENCE_MONTHS, SKILL_CONFIDENCE_HIGH_COUNT, SKILL_CONFIDENCE_MEDIUM_COUNT, TITLE_CONFIDENCE_HIGH_COUNT, TITLE_CONFIDENCE_MEDIUM_COUNT, VAGUE_EDUCATION_KEYWORD_MAX_LENGTH, } from "../constants/extraction.constants.js";
import { CITY_DICTIONARY, EDUCATION_KEYWORDS, REMOTE_LOCATION_LABEL, REMOTE_TOKENS, TITLE_PATTERNS, UNKNOWN_EDUCATION_LEVEL, } from "../constants/extraction.dictionary.js";
import { canonicalizeSkill } from "../constants/skills.dictionary.js";
import Logger from "../utils/logger.js";
import { findDictionarySkills } from "../utils/textMatching.js";
let ExtractionService = class ExtractionService {
    logger;
    async extractProfile(resumeText) {
        const skills = this.extractSkills(resumeText);
        const titles = this.extractTitles(resumeText);
        const { yearsOfExperience, confidence: yearsConfidence } = this.extractYearsOfExperience(resumeText);
        const { educationLevel, confidence: educationConfidence } = this.extractEducationLevel(resumeText);
        const locations = this.extractLocations(resumeText);
        const profile = {
            skills,
            titles,
            yearsOfExperience,
            educationLevel,
            locations,
            summary: this.buildSummary({ titles, skills, yearsOfExperience }),
            confidence: {
                skills: this.scoreSkillConfidence(skills.length),
                titles: this.scoreTitleConfidence(titles.length),
                yearsOfExperience: yearsConfidence,
                educationLevel: educationConfidence,
            },
            extractorVersion: EXTRACTOR_VERSION,
            extractedAt: new Date(),
        };
        this.logger.info("profile extracted", {
            skills: skills.length,
            titles: titles.length,
            yearsOfExperience,
            extractorVersion: EXTRACTOR_VERSION,
        });
        return {
            profile,
            /*
             * Contact details are extracted but transient. Nothing in the ranking
             * reads them, and the app has no surface to show them, so storing them
             * would be collecting personal data for no consumer.
             */
            contact: this.extractContact(resumeText),
        };
    }
    /**
     * Skills -> canonical dictionary tokens.
     *
     * Canonicalised because scoring intersects the two arrays with
     * `$setIntersection`, which is exact-string: a profile saying "k8s" must land
     * on the same token the seed writes for a posting saying "kubernetes", or
     * every one of that user's infrastructure leads scores zero overlap.
     */
    extractSkills(text) {
        const canonical = findDictionarySkills(text).map(canonicalizeSkill);
        return [...new Set(canonical)];
    }
    /**
     * Titles -> canonical labels.
     *
     * Every pattern is tested, not just the first match. A resume naming both
     * "Data Analyst" and "Project Manager" should carry both — a person can hold
     * two roles, and dropping the second would narrow the title filter to one
     * target for someone who has two.
     */
    extractTitles(text) {
        const labels = [];
        for (const { label, pattern } of TITLE_PATTERNS) {
            if (pattern.test(text)) {
                labels.push(label);
            }
        }
        return labels;
    }
    /**
     * Date ranges -> total months, taking the union.
     *
     * The union matters: someone who moved from one team to another inside the
     * same company writes two overlapping date ranges, and summing them double
     * counts. Ranges are converted to absolute month offsets, sorted, merged
     * where they touch or overlap, and only then summed.
     */
    extractYearsOfExperience(text) {
        const ranges = this.parseDateRanges(text);
        if (ranges.length === 0) {
            return { yearsOfExperience: 0, confidence: ExtractionConfidence.LOW };
        }
        const merged = this.mergeRanges(ranges);
        const totalMonths = merged.reduce((sum, range) => sum + this.rangeMonths(range), 0);
        const years = totalMonths / 12;
        /*
         * Ceilings, not clamps. A range summing to 60 years has been mis-parsed —
         * usually an education block read as employment — and clamping it to 45
         * would present a confidently wrong number to the user. Reporting zero with
         * `low` confidence says "we could not read this", which is the truth and is
         * correctable through the profile page.
         */
        if (years > MAX_PLAUSIBLE_EXPERIENCE_YEARS) {
            return { yearsOfExperience: 0, confidence: ExtractionConfidence.LOW };
        }
        const evidence = merged.length;
        return {
            yearsOfExperience: Math.round(years * 10) / 10,
            confidence: evidence >= EXPERIENCE_CONFIDENCE_HIGH_RANGE_COUNT
                ? ExtractionConfidence.HIGH
                : evidence >= EXPERIENCE_CONFIDENCE_MEDIUM_RANGE_COUNT
                    ? ExtractionConfidence.MEDIUM
                    : ExtractionConfidence.LOW,
        };
    }
    /**
     * Find every date range in the document.
     *
     * Built from `DATE_RANGE_SOURCE` with `new RegExp` rather than a literal so
     * the capture ordinals are documented in one place. Destructure the match
     * positionally — see that constant for why the group order is load-bearing.
     */
    parseDateRanges(text) {
        const pattern = new RegExp(DATE_RANGE_SOURCE, "gi");
        const ranges = [];
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth() + 1;
        for (const match of text.matchAll(pattern)) {
            const [, startMonthWord, startMonthNumber, startYear, endMonthWord, endMonthNumber, endYear] = match;
            const startY = Number(startYear);
            const endIsOngoing = endYear !== undefined && PRESENT_RE.test(endYear);
            const endY = endIsOngoing ? currentYear : Number(endYear);
            if (!Number.isFinite(startY) || !Number.isFinite(endY) || endY < startY) {
                continue;
            }
            const startM = this.monthNumber(startMonthWord, startMonthNumber, 1);
            const endM = endIsOngoing
                ? currentMonth
                : this.monthNumber(endMonthWord, endMonthNumber, 12);
            ranges.push({
                startYear: startY,
                startMonth: startM,
                endYear: endY,
                endMonth: endM,
                isOngoing: endIsOngoing,
            });
        }
        return ranges;
    }
    /** Month from either a name or a number, defaulting when neither is given. */
    monthNumber(word, numeric, fallback) {
        if (word) {
            const month = MONTH_INDEX[word.slice(0, 3).toLowerCase()];
            if (month)
                return month;
        }
        if (numeric) {
            const parsed = Number(numeric);
            /* Guards 13/2021 style typos and anything else out of range. */
            if (Number.isInteger(parsed) && parsed >= 1 && parsed <= 12) {
                return parsed;
            }
        }
        return fallback;
    }
    /** Total months in a range, floored at zero for a reversed pair. */
    rangeMonths(range) {
        const start = range.startYear * 12 + (range.startMonth - 1);
        const end = range.endYear * 12 + (range.endMonth - 1);
        return Math.max(0, end - start);
    }
    /**
     * Merge ranges that touch or overlap, then drop sub-year fragments.
     *
     * Short ranges are dropped *after* merging, not before: a two-month contract
     * inside a three-year block is already absorbed by the merge, so filtering
     * first would not remove it anyway, and filtering first would let a short
     * fragment in a resume whose only other range was unreadable stand as the
     * entire career.
     */
    mergeRanges(ranges) {
        if (ranges.length === 0)
            return [];
        const asOffsets = ranges
            .map((range) => ({
            start: range.startYear * 12 + (range.startMonth - 1),
            end: range.endYear * 12 + (range.endMonth - 1),
        }))
            .sort((a, b) => a.start - b.start);
        const merged = [];
        for (const range of asOffsets) {
            const last = merged[merged.length - 1];
            if (last && range.start <= last.end) {
                last.end = Math.max(last.end, range.end);
            }
            else {
                merged.push({ start: range.start, end: range.end });
            }
        }
        const minMonths = MIN_EXPERIENCE_MONTHS;
        return merged
            .filter((range) => range.end - range.start >= minMonths)
            .filter((range) => range.end - range.start <= MAX_REASONABLE_SINGLE_EMPLOYMENT_YEARS * 12)
            .map((range) => ({
            startYear: Math.floor(range.start / 12),
            startMonth: (range.start % 12) + 1,
            endYear: Math.floor(range.end / 12),
            endMonth: (range.end % 12) + 1,
            isOngoing: false,
        }));
    }
    /**
     * Education level, searched inside an education section when one exists.
     *
     * Narrowing to the section matters: "B.S." appearing in the summary is likelier
     * to be a certification than a degree, whereas "Education: B.S. in Computer
     * Science" is not. Falls back to a whole-document search when no heading is
     * found, since plenty of resumes use a heading this pattern does not cover.
     */
    extractEducationLevel(text) {
        const lowered = text.toLowerCase();
        const heading = new RegExp(EDUCATION_SECTION_PATTERN, "i").exec(text);
        const region = heading
            ? lowered.slice(heading.index, heading.index + 1_500)
            : lowered;
        for (const { level, keywords } of EDUCATION_KEYWORDS) {
            const hit = keywords.find((keyword) => region.includes(keyword));
            if (hit) {
                return {
                    educationLevel: level,
                    /*
                     * A short keyword is weak evidence on its own. "graduate" appears in
                     * "Willowbrook Graduate School", which is not a degree level, so
                     * generic single words are capped at `low` however the level
                     * resolved.
                     */
                    confidence: hit.length <= VAGUE_EDUCATION_KEYWORD_MAX_LENGTH
                        ? ExtractionConfidence.LOW
                        : ExtractionConfidence.HIGH,
                };
            }
        }
        return {
            educationLevel: UNKNOWN_EDUCATION_LEVEL,
            confidence: ExtractionConfidence.LOW,
        };
    }
    /**
     * Locations, preferring the most specific city mentioned.
     *
     * Remote is a filter input rather than a place: the recommender treats the
     * literal token `remote` as "remote only" and any other value as a location
     * to match. Both are emitted so the user sees what was read.
     */
    extractLocations(text) {
        const lowered = text.toLowerCase();
        const locations = [];
        if (REMOTE_TOKENS.some((token) => lowered.includes(token))) {
            locations.push(REMOTE_LOCATION_LABEL);
        }
        /*
         * Longest first, so "san francisco" is preferred over "sf" and "new york"
         * over "nyc" — the two are the same city, and matching on the short
         * abbreviation would fragment the filter.
         */
        const city = CITY_DICTIONARY.filter((name) => new RegExp(`\\b${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`).test(lowered)).sort((a, b) => b.length - a.length)[0];
        if (city) {
            locations.push(city);
        }
        return locations;
    }
    /**
     * Email and phone, matched but never persisted.
     *
     * Kept because the regexes are cheap and the pattern is worth having if a
     * contact field is ever added — but the values are not written to the user
     * document, since nothing in the ranking uses them.
     */
    extractContact(text) {
        const email = /\b[\w.+-]+@[\w-]+\.[\w.]+\b/.exec(text);
        /* Requires separators, so a bare number is not read as a phone number. */
        const phone = /\+?\d[\d\s().-]{8,}\d/.exec(text);
        return {
            email: email?.[0] ?? null,
            phone: phone?.[0]?.trim() ?? null,
        };
    }
    /**
     * One sentence describing the profile, built from what was extracted.
     *
     * Assembled rather than quoted: a resume's own summary line describes a career
     * in the candidate's framing, and this is a neutral summary of the fields the
     * recommender actually uses.
     */
    buildSummary(input) {
        const parts = [];
        if (input.titles.length > 0) {
            parts.push(input.titles.slice(0, 2).join(" / "));
        }
        if (input.yearsOfExperience > 0) {
            parts.push(`${input.yearsOfExperience} years of experience`);
        }
        if (input.skills.length > 0) {
            parts.push(`skills include ${input.skills.slice(0, 6).join(", ")}`);
        }
        return parts.join("; ").slice(0, MAX_SUMMARY_SENTENCE_LENGTH);
    }
    scoreSkillConfidence(count) {
        if (count >= SKILL_CONFIDENCE_HIGH_COUNT)
            return ExtractionConfidence.HIGH;
        if (count >= SKILL_CONFIDENCE_MEDIUM_COUNT)
            return ExtractionConfidence.MEDIUM;
        return ExtractionConfidence.LOW;
    }
    scoreTitleConfidence(count) {
        if (count >= TITLE_CONFIDENCE_HIGH_COUNT)
            return ExtractionConfidence.HIGH;
        if (count >= TITLE_CONFIDENCE_MEDIUM_COUNT)
            return ExtractionConfidence.MEDIUM;
        return ExtractionConfidence.LOW;
    }
};
__decorate([
    inject(TYPES.Logger),
    __metadata("design:type", Logger)
], ExtractionService.prototype, "logger", void 0);
ExtractionService = __decorate([
    injectable()
], ExtractionService);
export default ExtractionService;
/** Month name -> number, for the first three letters the parser captures. */
const MONTH_INDEX = {
    jan: 1,
    feb: 2,
    mar: 3,
    apr: 4,
    may: 5,
    jun: 6,
    jul: 7,
    aug: 8,
    sep: 9,
    oct: 10,
    nov: 11,
    dec: 12,
};
/** Open-ended range tails, resolved to the current month. */
const PRESENT_RE = /^(?:present|current|now|ongoing|to date|until now)$/i;
