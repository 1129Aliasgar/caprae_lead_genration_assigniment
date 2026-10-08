/**
 * @author aliasgarbootwala@gmail.com
 *
 * Orchestration for profile extraction and lead ranking.
 *
 * Every business rule lives here:
 *
 *   - the user must exist
 *   - they must have extracted a profile before anything can be ranked
 *   - `topN` is clamped rather than trusted
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
import { STATUS_CODE } from "../constants/statusCode.js";
import { ExtractionConfidence } from "../constants/enums.js";
import { DEFAULT_TOP_N, MAX_TOP_N } from "../constants/recommendation.constants.js";
import ApiError from "../utils/apiError.js";
import Logger from "../utils/logger.js";
import RecommendationRepository from "../repositories/recommendation.repository.js";
import ExtractionService from "./extraction.service.js";
import { enrichLead, enrichLeads } from "../utils/enrichment.helper.js";
import { buildMatchingContext } from "../utils/recommendationEngine.js";
/**
 * Editable field -> the `ProfileConfidence` key that describes it.
 *
 * Exists because the mapping is not one-to-one: `locations` is inferred from
 * the same signals as `titles` and reuses that confidence, and
 * `educationLevel` shares `confidence.educationLevel` while `yearsOfExperience`
 * has its own. Writing the pairs out here means adding an editable field cannot
 * silently leave its confidence flag behind — the default branch is the absence
 * of a mapping, and the only such fields are ones that carry no confidence.
 */
const CONFIDENCE_KEY_BY_FIELD = {
    titles: "titles",
    skills: "skills",
    locations: "titles",
    yearsOfExperience: "yearsOfExperience",
    educationLevel: "educationLevel",
};
let RecommendationService = class RecommendationService {
    recommendationRepository;
    extractionService;
    logger;
    /**
       * Run extraction and store the result.
       *
       * There is no separate confirmation step: what is extracted is what is
       * ranked against. The per-field confidence that comes back is the mitigation
       * for that decision — it says which parts of the machine's reading are worth
       * correcting, and `updateProfile` is where the user corrects them.
       */
    async extractProfile(userId, resumeText) {
        const user = await this.recommendationRepository.findUserProfile(userId);
        if (!user) {
            throw new ApiError("User not found", STATUS_CODE.NOT_FOUND);
        }
        const result = await this.extractionService.extractProfile(resumeText);
        await this.recommendationRepository.saveProfile(userId, result.profile, resumeText);
        this.logger.info("profile extracted", {
            userId,
            skills: result.profile.skills.length,
            titles: result.profile.titles.length,
            extractorVersion: result.profile.extractorVersion,
        });
        return result;
    }
    /**
   * Apply a user's corrections to the stored profile.
   *
   * The one piece of policy here is what happens to `confidence`.
   *
   * A corrected field is promoted to `high`. Two reasons, and the second is the
   * important one:
   *
   *   1. The user has just asserted this value, so the extractor's uncertainty
   *      about it no longer describes anything real. Leaving it at `low` would
   *      keep showing "please check this" next to a field the user has checked.
   *   2. `confidence` is the signal that says *this profile is probably wrong*.
   *      If a user could edit `titles` and leave the flag reading `low`, the
   *      warning would outlive the reason for it — and the flag would then be
   *      telling users what they should think rather than what the parser found.
   *
   * The client cannot set `confidence` directly; `unknown(false)` in the schema
   * rejects it. That keeps the number meaningful: after any edit, `low` means
   * "the machine is unsure about this and nobody has corrected it".
   *
   * Returns the profile as stored, so the client renders the server's version
   * rather than echoing back what it hoped was saved.
   */
    async updateProfile(userId, changes) {
        const user = await this.recommendationRepository.findUserProfile(userId);
        if (!user) {
            throw new ApiError("User not found", STATUS_CODE.NOT_FOUND);
        }
        const existing = (user.profile ?? {});
        /*
         * Guard on `extractedAt`, not on "does it have skills".
         *
         * An earlier version of this checked `skills.length === 0`, which looked
         * like a reasonable proxy for "no profile yet" and was wrong twice over: a
         * user who legitimately has no extractable skills, or who had just cleared
         * their own skill list, became permanently un-editable — the one edit that
         * would have fixed their profile was the one the endpoint refused.
         *
         * `extractedAt` is set by the extractor and by nothing else, so it answers
         * the question actually being asked: has anything been extracted for this
         * user yet?
         */
        if (!existing.extractedAt) {
            /*
             * Editing a profile that does not exist yet is rejected rather than
             * treated as a create. `PATCH` on a missing resource being a 404 is
             * behaviour every HTTP client already understands; silently turning a
             * PATCH into an upsert would hide a frontend bug behind a success.
             */
            throw new ApiError("Paste your resume before editing the profile", STATUS_CODE.BAD_REQUEST);
        }
        const fields = Object.keys(changes);
        const promoted = fields.reduce((acc, field) => {
            acc[field] = changes[field];
            return acc;
        }, {});
        /*
         * `yearsOfExperience` and `educationLevel` are the only editable fields
         * that carry a confidence key; `locations` reuses `titles`' because the
         * extractor infers both from the same "where are you" signals. Keeping that
         * alias in one place stops it drifting from `ProfileConfidence`.
         */
        for (const field of fields) {
            const key = CONFIDENCE_KEY_BY_FIELD[field];
            if (!key)
                continue;
            promoted[`confidence.${key}`] = ExtractionConfidence.HIGH;
        }
        const updated = await this.recommendationRepository.updateProfileFields(userId, promoted);
        this.logger.info("profile updated", {
            userId,
            fields: fields.join(","),
        });
        return updated?.profile;
    }
    /** Ranked leads for the stored profile. */
    async getRecommendations(input) {
        const context = await this.buildMatchingContext(input.userId, input.topN);
        const leads = await this.recommendationRepository.findRankedLeads(context);
        this.logger.info("recommendations ranked", {
            userId: input.userId,
            returned: leads.length,
            topN: context.topN,
        });
        return enrichLeads(leads);
    }
    /** One lead, with the same score breakdown the list view used. */
    async getLeadDetail(input) {
        const context = await this.buildMatchingContext(input.userId);
        const leadId = parseLeadId(input.leadId);
        const lead = await this.recommendationRepository.findLeadDetail(context, leadId);
        if (!lead) {
            /*
             * Covers both "no such lead" and "this lead does not match you". The
             * caller cannot distinguish them, and should not be able to — a lead the
             * user would never have been shown should not be discoverable by id.
             */
            throw new ApiError("Lead not found or does not match your profile", STATUS_CODE.NOT_FOUND);
        }
        return enrichLead(lead);
    }
    /**
     * Load the profile and build the pipeline context.
     *
     * The "have you extracted yet" gate lives here, in one place, because the
     * list and detail endpoints must enforce it identically — a detail endpoint
     * that skipped it would let a user without a profile rank individual leads.
     */
    async buildMatchingContext(userId, topN) {
        const user = await this.recommendationRepository.findUserProfile(userId);
        if (!user) {
            throw new ApiError("User not found", STATUS_CODE.NOT_FOUND);
        }
        const profile = user.profile;
        if (!profile || (profile.skills?.length ?? 0) === 0) {
            throw new ApiError("Paste your resume to get recommendations", STATUS_CODE.BAD_REQUEST);
        }
        return buildMatchingContext({
            profile,
            /*
             * Clamped here rather than trusting the request. At 33k leads an
             * unbounded `topN` is a slow aggregation, not a large response.
             */
            topN: clampTopN(topN),
        });
    }
};
__decorate([
    inject(TYPES.RecommendationRepository),
    __metadata("design:type", RecommendationRepository)
], RecommendationService.prototype, "recommendationRepository", void 0);
__decorate([
    inject(TYPES.ExtractionService),
    __metadata("design:type", ExtractionService)
], RecommendationService.prototype, "extractionService", void 0);
__decorate([
    inject(TYPES.Logger),
    __metadata("design:type", Logger)
], RecommendationService.prototype, "logger", void 0);
RecommendationService = __decorate([
    injectable()
], RecommendationService);
export default RecommendationService;
/**
 * Constrain `topN` to `[1, MAX_TOP_N]`.
 *
 * The validator already bounds it, but this is the single narrowing point
 * between "a client asked for N" and "the database is asked to sort and return
 * N documents", so it is enforced regardless of what got through.
 */
function clampTopN(requested) {
    if (typeof requested !== "number" || !Number.isFinite(requested)) {
        return DEFAULT_TOP_N;
    }
    return Math.min(Math.max(1, Math.floor(requested)), MAX_TOP_N);
}
/**
 * Lead ids arrive as the numeric `jobId`.
 *
 * Anything else is a client bug and is rejected rather than coerced to a
 * number, which would silently match the wrong lead.
 */
function parseLeadId(raw) {
    const parsed = Number(raw);
    if (!Number.isInteger(parsed) || parsed <= 0) {
        throw new ApiError("Invalid lead id", STATUS_CODE.BAD_REQUEST);
    }
    return parsed;
}
