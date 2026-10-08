/**
 * @author aliasgarbootwala@gmail.com
 *
 * Rate limit budgets, resolved from the environment at startup.
 *
 * The raw defaults live in `config/env.ts`; this module exists so call sites
 * read `RATE_LIMIT_MAX_REQUESTS` rather than `env.rateLimit.maxRequests`, and
 * so the policy — one minute, 100 requests — is stated in one place.
 *
 * Import direction is `env` -> here, never the reverse. `config/env.ts` must
 * not import this file, or the two would be circular.
 */
import { env } from "../config/env.js";
/** Sliding window length. One minute, per the agreed policy. */
export const RATE_LIMIT_WINDOW_MS = env.rateLimit.windowMs;
/** Budget per caller per window for the profile endpoints. */
export const RATE_LIMIT_MAX_REQUESTS = env.rateLimit.maxRequests;
/**
 * Tighter budget for the ranking endpoints.
 *
 * Each recommendation request runs a full aggregation over the lead
 * collection. At the shared budget, one user repeatedly asking for fresh
 * rankings could keep the database busy for the whole window — this limit is
 * on *cost to the server*, not on politeness.
 */
export const RATE_LIMIT_RECOMMENDATIONS_MAX = env.rateLimit.recommendationsMax;
