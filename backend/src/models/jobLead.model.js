/**
 * @author aliasgarbootwala@gmail.com
 *
 * A single job lead, seeded from the `xanderios/linkedin-job-postings`
 * Hugging Face dataset by `scripts/seed.ts`.
 *
 * Two things about the source data shape this schema:
 *
 * 1. Nearly every numeric column in the dataset (`min_salary`, `max_salary`,
 *    `applies`, `views`, `remote_allowed`) is a float that is regularly
 *    `null`. The seed coalesces those to 0 / 1 so the scoring pipeline never
 *    has to null-check inside an aggregation expression, and so the hard
 *    filters stay index-friendly.
 *
 * 2. `skills` is derived, not sourced. `skills_desc` is a free-text string
 *    (and `null` on a large share of rows), which cannot be intersected with a
 *    user's confirmed skill list. Splitting it into an array at seed time is
 *    what makes `$setIntersection` — and therefore `skillScore` — possible in
 *    Mongo. See `utils/recommendationEngine.ts`.
 */
import mongoose from "mongoose";
const jobLeadSchema = new mongoose.Schema({
    jobId: {
        type: Number,
        required: true,
        unique: true,
        index: true,
    },
    title: {
        type: String,
        required: true,
        index: true,
    },
    description: {
        type: String,
        default: "",
    },
    skillsDesc: {
        type: String,
        default: "",
    },
    companyId: {
        type: Number,
        default: 0,
    },
    minSalary: {
        type: Number,
        default: 0,
        index: true,
    },
    maxSalary: {
        type: Number,
        default: 0,
        index: true,
    },
    payPeriod: {
        type: String,
        default: "",
    },
    currency: {
        type: String,
        default: "",
    },
    formattedWorkType: {
        type: String,
        default: "",
        index: true,
    },
    formattedExperienceLevel: {
        type: String,
        default: "",
        index: true,
    },
    location: {
        type: String,
        default: "",
        index: true,
    },
    remoteAllowed: {
        type: Number,
        default: 0,
        index: true,
    },
    views: {
        type: Number,
        default: 0,
    },
    applies: {
        type: Number,
        default: 0,
    },
    jobPostingUrl: {
        type: String,
        default: "",
    },
    applicationUrl: {
        type: String,
        default: "",
    },
    listedTime: {
        type: Number,
        default: 0,
    },
    expiry: {
        type: Number,
        default: 0,
    },
    /*
     * Derived at seed time. Never written by hand — re-running the seed
     * recomputes all three from the fields above.
     */
    /** Midpoint of min/max. 0 when the source row carried no salary at all. */
    salaryMidpoint: {
        type: Number,
        default: 0,
    },
    /** applies / views, clamped to 0..1. 0.5 when views is 0 (see engine). */
    leadQualityScore: {
        type: Number,
        default: 0,
    },
    /** Location lowercased and whitespace-collapsed for case-insensitive match. */
    normalizedLocation: {
        type: String,
        default: "",
    },
    /**
     * `skillsDesc` split into lowercased tokens. Powers the skill intersection
     * in the scoring pipeline. Empty for rows where `skills_desc` was null.
     */
    skills: {
        type: [String],
        default: [],
    },
}, { timestamps: true });
/*
 * Compound index backing the hard-filter stage: a location + experience level
 * scan narrowed by salary is the pipeline's most selective shape.
 */
jobLeadSchema.index({
    location: 1,
    formattedExperienceLevel: 1,
    minSalary: 1,
});
/*
 * Free-text search over title, description and skillsDesc.
 */
jobLeadSchema.index({
    title: "text",
    description: "text",
    skillsDesc: "text",
});
export const JobLead = mongoose.model("JobLead", jobLeadSchema);
