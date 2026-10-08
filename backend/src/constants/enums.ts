/**
 * @author aliasgarbootwala@gmail.com
 */

/**
 * Ordered least -> most specialised. `extraction.service.ts` relies on this
 * ordering when it picks the highest level found in a resume.
 */
export enum EducationLevel {
  HIGH_SCHOOL = "HighSchool",
  ASSOCIATE = "Associate",
  BACHELORS = "Bachelors",
  MASTERS = "Masters",
  PHD = "PhD",
}

/**
 * Values match `formatted_experience_level` in the xanderios/linkedin-job-postings
 * dataset verbatim, so a user preference can be pushed straight into the
 * hard-filter `$match` without a translation table.
 */
export enum ExperienceLevel {
  INTERNSHIP = "Internship",
  ENTRY_LEVEL = "Entry level",
  MID_SENIOR_LEVEL = "Mid-Senior level",
  SENIOR_LEVEL = "Senior level",
  DIRECTOR = "Director",
  EXECUTIVE = "Executive",
  NOT_SPECIFIED = "Not specified",
}

/** Per-field trust produced by the extractor. */
export enum ExtractionConfidence {
  HIGH = "high",
  MEDIUM = "medium",
  LOW = "low",
}

/** Rank bucket derived from `finalScore`. */
export enum LeadTier {
  A = "A",
  B = "B",
  C = "C",
}

/**
 * The six scoring dimensions. Doubles as the key set of `ScoringWeights`, so
 * the weights object can be checked against it at compile time.
 */
export enum WeightType {
  TITLE_MATCH = "titleMatch",
  SKILL_MATCH = "skillMatch",
  SALARY_FIT = "salaryFit",
  LOCATION_FIT = "locationFit",
  EXPERIENCE_FIT = "experienceFit",
  LEAD_QUALITY = "leadQuality",
}
