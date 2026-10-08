/**
 * @author aliasgarbootwala@gmail.com
 *
 * Data access for the recommendation feature.
 *
 * The repository runs the pipeline and returns plain documents. It holds no
 * ranking logic of its own — that lives in `utils/recommendationEngine.ts` — and
 * no business rules: whether the user has a usable profile is the service's
 * call.
 */
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { injectable } from "inversify";
import { JobLead } from "../models/jobLead.model.js";
import { User } from "../models/user.model.js";
import { buildLeadDetailPipeline, buildRecommendationPipeline, } from "../utils/recommendationEngine.js";
let RecommendationRepository = class RecommendationRepository {
    /**
     * The user's stored profile.
     *
     * `resumeText` is excluded by the projection — it can hold a whole resume and
     * nothing in the ranking reads it.
     *
     * Selects only what the feature uses, so `password` is never fetched.
     */
    async findUserProfile(userId) {
        return await User.findById(userId).select("profile resumeText");
    }
    /**
     * Persist what the extractor found, plus the text it came from.
     *
     * One write, so there is no window in which the profile and the text it came
     * from disagree.
     */
    async saveProfile(userId, profile, resumeText) {
        return await User.findByIdAndUpdate(userId, { $set: { profile, resumeText } }, { returnDocument: "after" }).select("profile");
    }
    /**
     * Apply a partial correction to the stored profile.
     *
     * Dotted paths rather than `$set: { profile }`, because a whole-object set
     * would replace the profile and drop every field the caller did not send —
     * a request to correct one skill would silently erase the titles, the
     * locations and the years that make the ranking work.
     *
     * `confidence` is written here rather than accepted from the client: see
     * `RecommendationService.updateProfile`.
     */
    async updateProfileFields(userId, changes) {
        const set = Object.entries(changes).reduce((acc, [field, value]) => {
            acc[`profile.${field}`] = value;
            return acc;
        }, {});
        return await User.findByIdAndUpdate(userId, { $set: set }, {
            returnDocument: "after",
            runValidators: true,
            /*
             * `timestamps: false` because this schema declares none; leaving it on
             * is harmless but asks Mongoose to maintain a field that does not
             * exist, which is noise in the update document.
             */
            timestamps: false,
        }).select("profile");
    }
    /** Ranked leads. `topN` is applied inside the pipeline, not here. */
    async findRankedLeads(context) {
        const pipeline = buildRecommendationPipeline(context);
        return await JobLead.aggregate(pipeline).exec();
    }
    /**
     * One lead, ranked by the same rules as the list view.
     *
     * Returns null when the lead does not exist *or* fails this user's derived
     * filters. The caller cannot tell those apart, which is deliberate — a lead
     * the user would never have been shown should read as not found rather than
     * leak the fact that it exists.
     */
    async findLeadDetail(context, leadId) {
        const pipeline = buildLeadDetailPipeline(context, leadId);
        const results = await JobLead.aggregate(pipeline).exec();
        return results[0] ?? null;
    }
};
RecommendationRepository = __decorate([
    injectable()
], RecommendationRepository);
export default RecommendationRepository;
