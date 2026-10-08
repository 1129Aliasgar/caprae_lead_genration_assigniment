/**
 * Auth helpers.
 *
 * Split by execution context, because the answer to "am I logged in?" differs
 * between the server and the browser:
 *
 * - **Server** (Server Components, proxy): only the httpOnly cookie is
 *   visible. `localStorage` does not exist there.
 * - **Client**: `localStorage` is readable and is what the axios interceptor
 *   uses.
 *
 * Both are checked on the client. The backend sets an httpOnly cookie *and*
 * returns the JWT in the response body, and either one alone authenticates.
 *
 * This module deliberately does **not** import `next/headers`. Server and
 * client helpers live together here for discoverability, and mixing the two in
 * one file makes `next/headers` reachable from the client bundle — which
 * fails the build outright, since the App Router API is server-only.
 * `getServerToken` lives in `lib/serverAuth.js` instead.
 */

import { TOKEN_STORAGE_KEY } from "./constants";
import { clearToken, getStoredToken } from "./api";

/** Token from `localStorage`, or null on the server. */
export function getClientToken() {
  return getStoredToken();
}

/**
 * Best-effort client check for "should I bother rendering the app shell?".
 *
 * Advisory only, and cannot be trusted for access control — localStorage is
 * user-writable, so this returns true for a forged token. The real gate is the
 * proxy plus the backend's own per-request verification.
 */
export function isLoggedIn() {
  return Boolean(getStoredToken());
}

/** Drop every client-side trace of the session. */
export function logoutClient() {
  clearToken();
}

export { TOKEN_STORAGE_KEY };