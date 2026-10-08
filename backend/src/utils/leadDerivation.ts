/**
 * @author aliasgarbootwala@gmail.com
 *
 * Lead quality and location normalisation.
 *
 * Kept out of `seed.db.ts` because `scripts/test/` unit-tests them directly —
 * they are the two pieces of derived data most likely to be reasoned about
 * later by the weight-tuning work, and neither is worth reading through a
 * 300-line loop.
 */

import { findDictionarySkills } from "./textMatching.js";
import { canonicalizeSkill } from "../constants/skills.dictionary.js";

/**
 * `applies / views`, clamped to 0..1.
 *
 * Returns 0.5 when views is 0, per the scoring spec: a lead nobody has looked
 * at is neither good nor bad, and scoring it 0 would sink every fresh posting
 * below leads that merely got scrolled past.
 *
 * Negative values cannot occur (the dataset has no negatives) but are clamped
 * anyway so a future source change cannot push `leadQualityScore` out of the
 * 0..1 range the weights assume.
 */
export function computeLeadQualityScore(
  applies: number,
  views: number,
): number {
  if (views <= 0) {
    return 0.5;
  }

  return Math.min(1, Math.max(0, applies / views));
}

/**
 * Lowercase, trim, collapse internal whitespace.
 *
 * `"Austin,  TX "` and `"austin, tx"` must reach Mongo as the same string for
 * the `location` hard filter and its case-insensitive regex to agree with each
 * other. Anything more aggressive (stripping state codes, expanding metro
 * aliases) belongs in the query layer, not in stored data.
 */
export function normalizeLocation(location: string): string {
  return location.trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * Split `skills_desc` into a lowercased, de-duplicated token array.
 *
 * This is the array the scoring pipeline intersects against a user's
 * skills. Two decisions matter:
 *
 * - Tokens are kept whole and lowercased rather than stemmed. Matching is done
 *   with `$setIntersection`, which is exact-string, so "React" will not match
 *   "React.js" unless the dictionary lists both — see `SKILL_DICTIONARY`.
 * - Known skills are canonicalised to their dictionary spelling so a posting
 *   saying "reactjs" lands on the same token the extractor emits for "React".
 *
 * Falls back to scanning the description for dictionary skills when
 * `skills_desc` is null, which it is on a large share of the dataset.
 */
export function extractSkills(
  skillsDesc: string,
  description = "",
): string[] {
  const source = skillsDesc.trim();

  if (source) {
    /*
     * Canonicalised, not merely lowercased. The scoring pipeline compares this
     * array against the user's skills with `$setIntersection`, which
     * is exact-string — so a posting listing "k8s" and a stored profile
     * listing "kubernetes" would score zero overlap if the two sides disagreed
     * on spelling. `canonicalizeSkill` is the single source of that agreement.
     */
    const tokens = source
      .split(/[,;/|]|\band\b/i)
      .map((token) => canonicalizeSkill(token))
      .filter((token) => token.length > 1 && token.length <= 40);

    return [...new Set(tokens)];
  }

/*
 * Free-text scan, so matching has to be anchored on token boundaries — a
 * plain `includes` reports "go" for "going", "category" and "goals", and
 * "r" for most job descriptions containing the letter. See
 * `utils/textMatching.ts`.
 */
  return findDictionarySkills(description).map(canonicalizeSkill);
}