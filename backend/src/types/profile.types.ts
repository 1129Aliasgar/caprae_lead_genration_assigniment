import {
  EducationLevel,
  ExtractionConfidence,
} from "../constants/enums.js";

/**
 * Per-field trust, returned alongside every extraction so the UI can flag which
 * parts of the machine's reading of a resume deserve a second look.
 */
export interface ProfileConfidence {
  skills: ExtractionConfidence;
  titles: ExtractionConfidence;
  yearsOfExperience: ExtractionConfidence;
  educationLevel: ExtractionConfidence;
}

/**
 * The structured profile the extractor infers from a resume, and the document
 * the recommender reads.
 *
 * There is no separate "confirmed" copy: `POST /profile/extract` persists what
 * it found and returns it in the same response, so there is no confirmation
 * round-trip and no pair of documents that could drift apart.
 */
export interface UserProfile {
  skills: string[];
  titles: string[];
  yearsOfExperience: number;
  educationLevel: EducationLevel;
  locations: string[];
  summary: string;
  confidence: ProfileConfidence;
  extractorVersion: string;
  extractedAt: Date;
}