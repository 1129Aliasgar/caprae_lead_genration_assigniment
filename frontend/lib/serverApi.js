import "server-only";

import { apiBaseUrl } from "./apiUrl";

/**
 * Server-side API access.
 *
 * Separate from `lib/api.js` because that file is built around axios and
 * `localStorage`, neither of which exists during Server Component rendering.
 *
 * This module uses `fetch` with the token forwarded as a Bearer header, and is
 * used by Server Components that fetch their own data. The two coexist: server
 * components get first paint without a loading spinner, and client components
 * handle interaction through axios.
 *
 * Every function returns a shaped result rather than throwing on a non-2xx. A
 * Server Component that throws renders the error boundary, which for a routine
 * "not logged in yet" or "no profile yet" is far heavier than the situation
 * warrants — those are states the UI should render, not crashes.
 */

/**
 * Auth token for server-side calls.
 *
 * Passed in rather than read from `localStorage`, which the server cannot see.
 * The proxy forwards the incoming cookie as a header for exactly this reason.
 */
export function authHeaders(token) {
  if (!token) return {};

  return { Authorization: `Bearer ${token}` };
}

/**
 * Fetch with a bearer token, returning a shaped failure instead of throwing.
 *
 * Never throws for a non-2xx: a Server Component that throws renders the error
 * boundary, which for a routine "not signed in yet" is far heavier than the
 * situation warrants — those are states the UI renders, not crashes.
 */
async function fetchJson(path, options = {}) {
  const { token, ...init } = options;

  const url = `${apiBaseUrl()}${path}`;

  try {
    const response = await fetch(url, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...authHeaders(token),
        ...init.headers,
      },
      cache: "no-store",
    });

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));

      return {
        ok: false,
        status: response.status,
        message: body.message || "Request failed",
        data: null,
      };
    }

    return {
      ok: true,
      status: response.status,
      message: null,
      data: await response.json(),
    };
  } catch (error) {
    /*
     * A refused connection or a timeout. Surfaced as a shaped failure so
     * callers have one thing to branch on rather than a thrown Error.
     */
    return {
      ok: false,
      status: 0,
      message:
        error instanceof Error ? error.message : "Could not reach the server",
      data: null,
    };
  }
}

/** Current user, or null when unauthenticated. */
export async function serverGetAuthProfile(token) {
  const result = await fetchJson("/api/v1/user/profile", { token });

  return result.ok ? result.data.data.user : null;
}

/**
 * Ranked recommendations.
 *
 * Returns the shaped result rather than just the data, because the caller has
 * to distinguish "no matches" from "no profile yet" from "backend down" —
 * three very different empty states.
 */
export async function serverGetRecommendations(token, topN = 100) {
  const result = await fetchJson("/api/v1/recommendations", {
    method: "POST",
    token,
    body: JSON.stringify({ topN }),
  });

  if (!result.ok) {
    return { ok: false, status: result.status, message: result.message, leads: [] };
  }

  return {
    ok: true,
    status: result.status,
    message: null,
    leads: result.data.data.leads ?? [],
  };
}

/** One lead's detail, including its score breakdown. */
export async function serverGetLeadDetail(token, leadId) {
  const result = await fetchJson(`/api/v1/recommendations/${leadId}`, { token });

  if (!result.ok) {
    return { ok: false, status: result.status, message: result.message, lead: null };
  }

  return { ok: true, status: result.status, message: null, lead: result.data.data.lead };
}