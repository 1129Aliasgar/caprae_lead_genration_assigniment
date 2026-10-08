/**
 * Server-only auth helpers.
 *
 * Separate from `lib/auth.js` because `next/headers` is a server-only API:
 * importing it from a module the client bundle can reach fails the build. This
 * file is only ever imported from Server Components.
 */

import "server-only";

import { cookies } from "next/headers";

/**
 * Token from the incoming request cookie.
 *
 * `cookies()` is async in Next 16 — awaiting it is required, not optional.
 *
 * The cookie is named `token`, and the frontend writes it itself after login
 * rather than relying on the one the backend sets. That is the important detail:
 * the backend's cookie lives on the API's domain, and this app is served from a
 * different one, so a cookie set by the API is invisible here. `storeToken` in
 * `lib/api.js` writes an equivalent copy on this origin, which is what makes
 * Server Components able to authenticate at all in production.
 *
 * The backend's httpOnly cookie is still doing its job — it is what protects the
 * API. This is a second, separate concern: making the app's own server know who
 * is signed in.
 */
export async function getServerToken() {
  const cookieStore = await cookies();

  return cookieStore.get("token")?.value ?? null;
}