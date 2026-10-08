/**
 * @author aliasgarbootwala@gmail.com
 */
/**
 * Ordered least -> most specialised. `extraction.service.ts` relies on this
 * ordering when it picks the highest level found in a resume.
 */
export var EducationLevel;
(function (EducationLevel) {
    EducationLevel["HIGH_SCHOOL"] = "HighSchool";
    EducationLevel["ASSOCIATE"] = "Associate";
    EducationLevel["BACHELORS"] = "Bachelors";
    EducationLevel["MASTERS"] = "Masters";
    EducationLevel["PHD"] = "PhD";
})(EducationLevel || (EducationLevel = {}));
/**
 * Values match `formatted_experience_level` in the xanderios/linkedin-job-postings
 * dataset verbatim, so a user preference can be pushed straight into the
 * hard-filter `$match` without a translation table.
 */
export var ExperienceLevel;
(function (ExperienceLevel) {
    ExperienceLevel["INTERNSHIP"] = "Internship";
    ExperienceLevel["ENTRY_LEVEL"] = "Entry level";
    ExperienceLevel["MID_SENIOR_LEVEL"] = "Mid-Senior level";
    ExperienceLevel["SENIOR_LEVEL"] = "Senior level";
    ExperienceLevel["DIRECTOR"] = "Director";
    ExperienceLevel["EXECUTIVE"] = "Executive";
    ExperienceLevel["NOT_SPECIFIED"] = "Not specified";
})(ExperienceLevel || (ExperienceLevel = {}));
/** Per-field trust produced by the extractor. */
export var ExtractionConfidence;
(function (ExtractionConfidence) {
    ExtractionConfidence["HIGH"] = "high";
    ExtractionConfidence["MEDIUM"] = "medium";
    ExtractionConfidence["LOW"] = "low";
})(ExtractionConfidence || (ExtractionConfidence = {}));
/** Rank bucket derived from `finalScore`. */
export var LeadTier;
(function (LeadTier) {
    LeadTier["A"] = "A";
    LeadTier["B"] = "B";
    LeadTier["C"] = "C";
})(LeadTier || (LeadTier = {}));
/**
 * The six scoring dimensions. Doubles as the key set of `ScoringWeights`, so
 * the weights object can be checked against it at compile time.
 */
export var WeightType;
(function (WeightType) {
    WeightType["TITLE_MATCH"] = "titleMatch";
    WeightType["SKILL_MATCH"] = "skillMatch";
    WeightType["SALARY_FIT"] = "salaryFit";
    WeightType["LOCATION_FIT"] = "locationFit";
    WeightType["EXPERIENCE_FIT"] = "experienceFit";
    WeightType["LEAD_QUALITY"] = "leadQuality";
})(WeightType || (WeightType = {}));
