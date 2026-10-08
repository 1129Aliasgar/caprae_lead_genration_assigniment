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
 * The cookie name is `token`: that is what the backend sets. The frontend also
 * mirrors the JWT into localStorage under its own key, but the backend's cookie
 * is httpOnly and cannot be renamed from here — which is the point of it.
 */
export async function getServerToken() {
  const cookieStore = await cookies();

  return cookieStore.get("token")?.value ?? null;
}