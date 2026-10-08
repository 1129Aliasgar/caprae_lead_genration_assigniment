/**
 * Next.js proxy (formerly "middleware").
 *
 * Next 16 renamed `middleware.js` to `proxy.js`; the semantics are unchanged
 * but the filename is not — a `middleware.js` here is ignored.
 *
 * What this does: bounces an unauthenticated visitor away from `/leads` and
 * `/profile` before any of that UI is sent to the browser.
 *
 * What it is *not*: the access control. It reads the `token` cookie and checks
 * only that something is present — a JWT is not verified here, because verifying
 * it requires a secret this edge runtime should not have. A forged cookie gets
 * past this layer and is then rejected by the backend on every real request,
 * which is the authoritative check.
 *
 * Cross-domain note, because this is what breaks in production: the API is
 * hosted separately from this app, so the httpOnly cookie it sets is never sent
 * here — it belongs to the API's domain. `storeToken` in `lib/api.js` writes an
 * equivalent `token` cookie on *this* origin after login, which is the only way
 * this layer can know a session exists. Without it every protected route
 * redirects to `/login` even after a successful sign-in.
 */

import { NextResponse } from "next/server";
import { APP_ROUTES } from "./lib/constants";

/** Routes that require a session. */
const PROTECTED_PREFIXES = ["/leads", "/profile"];

export function proxy(request) {
  const { pathname, search } = request.nextUrl;

  const isProtected = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );

  if (!isProtected) {
    return NextResponse.next();
  }

  const token = request.cookies.get("token")?.value;

  if (token) {
    return NextResponse.next();
  }

  const url = request.nextUrl.clone();

  url.pathname = APP_ROUTES.login;

  /*
   * Carrying the original destination through so login can return the user to
   * where they were headed. `url.search` rather than `searchParams.set`, which
   * would append to the copied query string.
   */
  url.search = `?next=${encodeURIComponent(pathname + search)}`;

  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/leads/:path*", "/profile/:path*"],
};