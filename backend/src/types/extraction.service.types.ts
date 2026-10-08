/**
 * @author aliasgarbootwala@gmail.com
 *
 * Service contracts for the profile extraction stage.
 *
 * Separate from `profile.types.ts` because these are the *inputs and results*
 * of one operation, whereas `profile.types.ts` describes the data as it is
 * stored on the user document. They are the same shape here — extraction
 * writes what it returns — but keeping the two files separate means a change
 * to storage does not silently alter the extraction contract.
 */

import type { UserProfile } from "./profile.types.js";

/** Contact details scraped from the resume. Never used for scoring. */
export interface ExtractedContact {
  email: string | null;
  phone: string | null;
}

/** Raw signal found for a single field, before it becomes a `UserProfile`. */
export interface DateRange {
  startYear: number;
  startMonth: number;
  endYear: number;
  endMonth: number;
  /** False for "Present"/"Current" ranges, resolved to the current month. */
  isOngoing: boolean;
}

export interface ExtractProfileInput {
  resumeText: string;
}

/**
 * Everything Tier-1 learned.
 *
 * `contact` is returned to the client for prefill but is not part of the
 * stored profile — it is transient.
 */
export interface ExtractProfileResult {
  profile: UserProfile;
  contact: ExtractedContact;
}

export interface ExtractionServiceInterface {
  extractProfile(resumeText: string): Promise<ExtractProfileResult>;
}