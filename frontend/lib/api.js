/**
 * The single axios instance and every API call in the app.
 *
 * No component imports axios directly — swapping the base URL, adding an
 * interceptor or mocking for tests is a change to this file alone.
 *
 * Two things are handled here rather than at call sites:
 *
 * 1. **Envelope unwrapping.** The backend answers `{ data, success: true }` or
 *    `{ message, success: false }`. The interceptor returns `response.data`, so
 *    callers write `res.data.token` rather than `res.data.data.data.token`.
 *
 * 2. **Error normalisation.** Every rejection becomes an `Error` carrying the
 *    backend's own message. Axios's default message ("Request failed with
 *    status code 400") tells a user nothing; "Paste your resume before
 *    requesting recommendations" tells them what to do. `status` is preserved
 *    so callers can branch on 401 without string-matching.
 */

import axios from "axios";
import { apiBaseUrl } from "./apiUrl";
import { API_ROUTES, TOKEN_COOKIE_NAME, TOKEN_STORAGE_KEY } from "./constants";

/**
 * Read the JWT.
 *
 * `localStorage` is not readable during Server Component rendering, hence the
 * guard. Returning null there is what makes every server-side caller fall back
 * to treating the request as unauthenticated.
 */
export function getStoredToken() {
  if (typeof window === "undefined") return null;

  return window.localStorage.getItem(TOKEN_STORAGE_KEY);
}

/**
 * Persist the JWT so client-side requests can authenticate.
 *
 * Two copies, deliberately, because neither alone survives production:
 *
 * 1. **localStorage** (`leadmatch.token`) — read by the axios request
 *    interceptor in the browser, which can attach `Authorization: Bearer`.
 *
 * 2. **A cookie named `token`** — read by `proxy.js` and by Server Components.
 *    This is the copy that matters in production. The backend sets an httpOnly
 *    cookie, but on *its own domain*; `your-app.netlify.app` and
 *    `your-api.onrender.com` are different origins, so Netlify's edge never sees
 *    it and every `/leads` request redirects back to `/login` — which looks
 *    exactly like login failing, right after it succeeded.
 *
 *    A cookie set by Render cannot be made visible to Netlify. Writing our own
 *    non-httpOnly copy on our own domain is the only thing that works.
 *
 * Security note: this cookie is deliberately *not* httpOnly, so an XSS payload
 * could read it — but the localStorage copy above is equally readable by the
 * same payload, so this adds no exposure that does not already exist. It is not
 * a substitute for the backend's httpOnly cookie, which remains the one that
 * matters for protecting the API from other origins.
 */
export function storeToken(token) {
  if (typeof window === "undefined") return;

  window.localStorage.setItem(TOKEN_STORAGE_KEY, token);

  /*
   * `max-age` is 1 day to match the JWT's own expiry, so the cookie cannot
   * outlive the token it mirrors and leave the proxy accepting a session the
   * backend will reject.
   *
   * `SameSite=Lax` sends it on top-level navigation (which is what the proxy
   * needs) while still withholding it from cross-site subrequests. `Secure` is
   * omitted so this also works on http://localhost in development.
   */
  document.cookie = `${TOKEN_COOKIE_NAME}=${token}; path=/; max-age=86400; samesite=lax`;
}

/**
 * Forget the JWT, in every place it was written.
 *
 * Both copies have to go. Leaving the `token` cookie behind is the worse of the
 * two: `proxy.js` would keep letting `/leads` through, the page would render,
 * and every server-side fetch would then 401 — leaving the user on a broken
 * leads page rather than a clean redirect to login.
 */
export function clearToken() {
  if (typeof window === "undefined") return;

  window.localStorage.removeItem(TOKEN_STORAGE_KEY);

  /* `max-age=0` expires immediately; path must match how it was written. */
  document.cookie = `${TOKEN_COOKIE_NAME}=; path=/; max-age=0; samesite=lax`;
}

const api = axios.create({
  /*
   * Trimmed for the same reason `apiBaseUrl()` does it in serverApi.js.
   *
   * Axios already normalises `baseURL`, so a trailing slash here was harmless —
   * but leaving the two modules reading the raw env var is exactly how the two
   * drifted apart in the first place, one working and one not. Same helper,
   * same value, one behaviour.
   */
  baseURL: apiBaseUrl(),
  headers: { "Content-Type": "application/json" },
  /*
   * The backend sets an httpOnly cookie on login and honours it as an auth
   * source. `withCredentials` lets that cookie travel on cross-origin XHR —
   * localhost:3000 calling localhost:5000 is cross-origin but same-site.
   *
   * Auth does not *depend* on this: the Bearer header below is the primary
   * mechanism, so a browser that blocks the cookie still works.
   */
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const token = getStoredToken();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    /*
     * `error.response` is absent for network failures and timeouts, where
     * there is no server message to show. Those fall through to axios's own
     * message, which for a connection refusal is at least accurate.
     */
    const message =
      error.response?.data?.message ||
      error.response?.data?.error ||
      error.message ||
      "Something went wrong";

    const normalised = new Error(message);

    normalised.status = error.response?.status ?? null;
    normalised.code = error.code ?? null;

    return Promise.reject(normalised);
  },
);

/* ------------------------------------------------------------------ auth -- */

export function register(payload) {
  return api.post(API_ROUTES.auth.register, payload);
}

export function login(payload) {
  return api.post(API_ROUTES.auth.login, payload);
}

export function getAuthProfile() {
  return api.get(API_ROUTES.auth.profile);
}

/**
 * The backend exposes logout as GET, not POST. Calling it with the wrong verb
 * is a 404, which would look like a broken endpoint rather than a wrong call.
 */
export function logout() {
  return api.get(API_ROUTES.auth.logout);
}

/* --------------------------------------------------------------- profile -- */

export function extractResume(resumeText) {
  return api.post(API_ROUTES.profile.extract, { resumeText });
}

/**
 * Correct individual fields of the stored profile.
 *
 * PATCH, not PUT, and only the changed fields are sent — the backend applies a
 * partial `$set`, so an omitted key leaves the stored value alone. Sending a
 * whole profile would work too, but it turns any concurrent change (a second
 * tab re-extracting) into an overwrite.
 *
 * `confidence` is not among the keys: the backend owns it and rejects it.
 */
export function updateProfile(changes) {
  return api.patch(API_ROUTES.profile.update, changes);
}



/* ------------------------------------------------------- recommendations -- */

export function getRecommendations(topN = 20) {
  return api.post(API_ROUTES.recommendations.list, { topN });
}

export function getLeadDetail(id) {
  return api.get(API_ROUTES.recommendations.detail(id));
}



export default api;