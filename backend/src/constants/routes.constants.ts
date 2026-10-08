/**
 * @author aliasgarbootwala@gmail.com
 *
 * Route base paths and request size limits.
 *
 * Declared here because two places need to agree on them: the controller
 * class decorators that register the routes, and `app.ts` which mounts the
 * rate limiters by path. A literal in either place would drift silently — the
 * limiter would quietly stop applying, with nothing failing.
 */

/** Base path for profile extraction. */
export const PROFILE_BASE_ROUTE = "/api/v1/profile";

/** Base path for ranking and lead detail. */
export const RECOMMENDATIONS_BASE_ROUTE = "/api/v1/recommendations";

/** Base path for the existing auth endpoints. */
export const AUTH_BASE_ROUTE = "/api/v1/user";

/**
 * Maximum accepted request body.
 *
 * Raised from 16kb because a pasted resume is routinely larger than that and
 * the body parser rejected it with a bare 413 before any handler ran. Also a
 * ceiling worth keeping: extraction runs regexes across the whole text, so body
 * size is a CPU-cost lever, not only a bandwidth one.
 */
export const BODY_SIZE_LIMIT = "64kb";

/** Health check path. */
export const HEALTH_ROUTE = "/api/v1/health";