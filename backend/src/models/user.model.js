import mongoose from "mongoose";
import { EducationLevel, ExtractionConfidence, } from "../constants/enums.js";
/**
 * The user document.
 *
 * One embedded profile rather than separate extracted/confirmed copies: the
 * `POST /profile/extract` endpoint persists what it found and returns it for
 * review in the same response, so there is no window in which two versions can
 * drift and no confirmation round-trip to get out of sync.
 *
 * The trade-off is explicit and worth stating — the ranking reads this document
 * directly, so a user cannot correct what the extractor got wrong before it
 * influences their recommendations. The per-field confidence is the mitigation:
 * it surfaces exactly which parts of the profile are worth a second look, so the
 * fix is repasting a better resume rather than editing fields one at a time.
 */
const UserSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        lowercase: true,
        unique: true,
    },
    email: {
        type: String,
        required: true,
        lowercase: true,
        unique: true,
    },
    password: {
        type: String,
        required: true,
        select: false,
    },
    /** The raw pasted text. Excluded from the ranking query's projection. */
    resumeText: {
        type: String,
        trim: true,
    },
    profile: {
        skills: { type: [String], default: [] },
        titles: { type: [String], default: [] },
        yearsOfExperience: { type: Number, default: 0 },
        educationLevel: {
            type: String,
            enum: Object.values(EducationLevel),
        },
        locations: { type: [String], default: [] },
        summary: { type: String, default: "" },
        /**
         * Per-field trust, so the UI can flag which fields to check. Defaults to
         * `low` rather than being `required`: Mongoose materialises this
         * sub-object on every new document because its siblings carry defaults,
         * so a `required` path here would make registration itself fail.
         */
        confidence: {
            skills: {
                type: String,
                enum: Object.values(ExtractionConfidence),
                default: ExtractionConfidence.LOW,
            },
            titles: {
                type: String,
                enum: Object.values(ExtractionConfidence),
                default: ExtractionConfidence.LOW,
            },
            yearsOfExperience: {
                type: String,
                enum: Object.values(ExtractionConfidence),
                default: ExtractionConfidence.LOW,
            },
            educationLevel: {
                type: String,
                enum: Object.values(ExtractionConfidence),
                default: ExtractionConfidence.LOW,
            },
        },
        /**
         * `null` rather than `required`, for the same materialisation reason.
         * The service always writes it with the rest of the extraction result,
         * so a stored profile is versioned.
         */
        extractorVersion: { type: String, default: null },
        extractedAt: { type: Date, default: Date.now },
    },
}, {
    timestamps: true,
    toJSON: {
        transform: (_doc, ret) => {
            delete ret.password;
            return ret;
        },
    },
});
UserSchema.index({
    username: 1,
    email: 1,
});
export const User = mongoose.model("User", UserSchema);
