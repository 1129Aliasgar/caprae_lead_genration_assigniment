/**
 * @author aliasgarbootwala@gmail.com
 *
 * Shared free-text matching primitives.
 *
 * Both the seed (`utils/leadDerivation.ts`) and the extractor
 * (`services/extraction.service.ts`) need to find dictionary entries inside prose.
 * That logic lives here so the two cannot drift — a boundary bug fixed in one
 * place is then fixed in both.
 */
import { SKILL_DICTIONARY } from "../constants/skills.dictionary.js";
/**
 * Escape regex metacharacters in a literal string.
 *
 * Every user-supplied value that becomes a pattern must pass through this. A
 * target title of `C++ (Senior)` is a malformed pattern and fails the whole
 * query; a title of `.*` matches every document in the collection.
 */
export function escapeRegExp(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
/**
 * Case-insensitive pattern matching `skill` only as a whole token.
 *
 * Boundary is expressed as "not preceded or followed by an alphanumeric"
 * rather than `\b`, because entries like `c++` and `.net` end in punctuation
 * where `\b` means the wrong thing: `\bc\+\+\b` does not match `c++` at all.
 * The class is kept deliberately narrow so `node.js` and `next.js` still match
 * on their internal dot while `go` does not match `google`.
 */
export function wordBoundaryPattern(skill) {
    return new RegExp(`(?<![a-z0-9])${escapeRegExp(skill)}(?![a-z0-9])`, "i");
}
/**
 * Every dictionary skill present in `text`, sorted for a stable result.
 *
 * Single-character entries (`r`, `c#`) are skipped: in prose they match
 * constantly and carry no signal. Callers that have an explicit skill list —
 * the seed reading `skills_desc` — keep those.
 */
export function findDictionarySkills(text) {
    if (!text) {
        return [];
    }
    const found = SKILL_DICTIONARY.filter((skill) => skill.length >= 2 && wordBoundaryPattern(skill).test(text));
    return [...new Set(found)];
}
