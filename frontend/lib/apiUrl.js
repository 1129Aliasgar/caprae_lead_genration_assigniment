/**
 * The base URL of the LeadMatch API, in one place.
 *
 * Separate from `serverApi.js` because that file imports `server-only` — pulling
 * it into the client bundle fails the build. This module has no side effects and
 * is safe in both, which is the whole point: the client and the server must
 * agree on where the API lives.
 */

/**
 * Base API URL, with any trailing slash removed.
 *
 * The trailing-slash trim exists because of a production-only bug that took a
 * while to diagnose. Render's dashboard shows `https://your-api.onrender.com/`,
 * and pasting that in as-is produced:
 *
 *   `${NEXT_PUBLIC_API_URL}/api/v1/recommendations`
 *     → https://your-api.onrender.com//api/v1/recommendations   →  404
 *
 * A double slash is a *different path* to Express, so it 404s rather than
 * failing loudly.
 *
 * What made it hard to spot: axios normalises `baseURL` internally, so every
 * client-side request returned 200 while Server Component fetches — built by
 * plain string concatenation — all 404'd. Same env var, same API, two different
 * results. The only visible symptom was "Can't reach the server" on `/leads`,
 * with the browser console showing a 404 that looked like a missing endpoint
 * rather than a malformed URL.
 *
 * Normalising here means a trailing slash in the env var is harmless, whatever
 * sets it.
 */
export function apiBaseUrl() {
  return (process.env.NEXT_PUBLIC_API_URL ?? "").replace(/\/+$/, "");
}