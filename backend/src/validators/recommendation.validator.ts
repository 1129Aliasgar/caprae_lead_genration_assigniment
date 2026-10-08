/**
 * @author aliasgarbootwala@gmail.com
 *
 * Joi schemas for the profile and recommendation endpoints.
 *
 * Same shape as `auth.validator.ts`: named schema consts, validated inline at
 * the top of each controller method. No validation middleware exists in this
 * codebase and introducing one for these routes alone would leave auth and
 * recommendations inconsistent.
 *
 * `unknown(false)` throughout: `extractProfileSchema` posts raw text, and
 * `updateProfileSchema` writes its body straight into `$set`. Both would
 * otherwise let a client set fields the schema does not model — including
 * `confidence`, which is the backend's own claim about its output.
 */

import Joi from "joi";
import { MAX_TOP_N } from "../constants/recommendation.constants.js";
import {
  MAX_RESUME_LENGTH,
  MAX_PROFILE_YEARS,
  MAX_PROFILE_LIST_ITEMS,
  MAX_PROFILE_ITEM_LENGTH,
} from "../constants/extraction.constants.js";
import { EducationLevel } from "../constants/enums.js";
import { env } from "../config/env.js";

export const extractProfileSchema = Joi.object({
  resumeText: Joi.string()
    .trim()
    .min(40)
    .max(MAX_RESUME_LENGTH)
    .required()
    .messages({
      "string.min": "resumeText must be at least 40 characters",
      "string.max": `resumeText must not exceed ${MAX_RESUME_LENGTH} characters`,
      "any.required": "resumeText is required",
    }),
}).unknown(false);

export const getRecommendationsSchema = Joi.object({
  topN: Joi.number()
    .integer()
    .min(1)
    .max(MAX_TOP_N)
    /*
     * Read from `env` so a deployment can change the page size without a code
     * change; `DEFAULT_TOP_N` is the value `env` itself falls back to.
     */
    .default(env.recommendations.defaultTopN)
    .messages({
      "number.max": `topN must not exceed ${MAX_TOP_N}`,
      "number.min": "topN must be at least 1",
    }),
}).unknown(false);

/**
 * Lead ids are the dataset's numeric `job_id`.
 *
 * Numeric rather than any-string: the alternative would accept an ObjectId and
 * pass it to a `$match` on a Number field, which silently matches nothing and
 * surfaces as a 404 for a lead that does exist.
 */
export const leadIdParamSchema = Joi.object({
  leadId: Joi.number()
    .integer()
    .positive()
    .required()
    .messages({
      "any.required": "leadId is required",
      "number.base": "leadId must be a number",
    }),
}).unknown(false);

/**
 * One entry in a corrected list field.
 *
 * `Joi.string()` alone would let an empty string through, and a list of
 * `["", "", "aws"]` scores as if the user had two extra skills — the
 * intersection ignores them but the divisor does not, so the score silently
 * halves. `.empty("")` is what stops a stray comma in the UI producing that.
 */
const profileListItem = Joi.string()
  .trim()
  .min(1)
  .max(MAX_PROFILE_ITEM_LENGTH)
  .empty("");

/**
 * `PATCH /api/v1/profile` — correct individual fields of the stored profile.
 *
 * Every key is optional and the object is applied as a partial update, so a
 * client sends only what changed. `unknown(false)` is load-bearing here: this
 * body is written straight into `$set`, and without it a client could write
 * `confidence`, `extractedAt` or `extractorVersion` — declaring its own output
 * high-confidence.
 *
 * `summary` is deliberately absent from the editable set. It is the extractor's
 * own one-line reading of the resume, feeds nothing in the ranking, and letting
 * a user write it would mean the UI had to render text that no longer came from
 * their document. `confidence` is likewise not editable — the service sets it,
 * not the client.
 */
export const updateProfileSchema = Joi.object({
  titles: Joi.array().items(profileListItem).max(MAX_PROFILE_LIST_ITEMS),
  skills: Joi.array().items(profileListItem).max(MAX_PROFILE_LIST_ITEMS),
  locations: Joi.array().items(profileListItem).max(MAX_PROFILE_LIST_ITEMS),
  yearsOfExperience: Joi.number()
    .min(0)
    .max(MAX_PROFILE_YEARS)
    .precision(1)
    .messages({
      "number.max": `yearsOfExperience must not exceed ${MAX_PROFILE_YEARS}`,
      "number.min": "yearsOfExperience cannot be negative",
    }),
  educationLevel: Joi.string().valid(...Object.values(EducationLevel)),
})
  /*
   * Without `.or()`, an empty `{}` is valid and would run a no-op `$set` and
   * return 200 — a client that sent nothing would be told it succeeded at
   * changing nothing. Better to reject it than to pretend.
   */
  .or(
    "titles",
    "skills",
    "locations",
    "yearsOfExperience",
    "educationLevel",
  )
  .unknown(false)
  .messages({
    "object.missing": "Provide at least one field to update",
  });