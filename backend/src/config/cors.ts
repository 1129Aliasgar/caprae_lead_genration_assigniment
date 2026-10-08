/**
 * @author aliasgarbootwala@gmail.com
 *
 * CORS origin resolution.
 *
 * Exists because of a rule that looks like a bug:
 *
 *   A browser rejects `Access-Control-Allow-Origin: *` on any request whose
 *   credentials mode is `include`. The two cannot be combined — the `cors`
 *   package will happily send both, and the failure surfaces only in the
 *   browser, which silently drops the response. The preflight still returns
 *   204 and the console shows only a CORS warning, so it looks like the POST
 *   never happened.
 *
 *   This API *needs* credentials, because login sets an httpOnly cookie that
 *   the Next.js proxy reads on the server. So `*` is not an option.
 *
 * The fix is to reflect the request's own origin instead of sending `*`. That
 * is only safe if the list of allowed origins is still enforced, which is what
 * `reflectOrigin` does — it echoes `Origin` back rather than allowing all.
 *
 * In development that means "any localhost port", which is the practical
 * equivalent of `*` for local work while remaining a valid credentialed
 * response.
 */

import type { CorsOptions } from "cors";
import { STATUS_CODE } from "../constants/statusCode.js";

/**
 * Loopback origins, any port.
 *
 * Deliberately matched as a prefix rather than a regex over the whole origin:
 * this accepts `http://localhost:3000` and `https://127.0.0.1:5173` but not
 * `http://localhost.evil.example`, which a looser check would let through.
 */
const LOOPBACK_ORIGIN = /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/;

/** Matches a comma or space separated list, ignoring empty entries. */
const ORIGIN_SEPARATOR = /[\s,]+/;

/**
 * Parse `CORS_ORIGIN` into a concrete allowlist.
 *
 * Returns `null` when the setting is a wildcard, which callers read as
 * "reflect the request origin" rather than "allow everything".
 */
export function parseAllowedOrigins(value: string | undefined): string[] | null {
  const configured = (value ?? "").trim();

  if (configured === "" || configured === "*") {
    return null;
  }

  const origins = configured
    .split(ORIGIN_SEPARATOR)
    .map((origin) => origin.trim().replace(/\/$/, ""))
    .filter((origin) => origin.length > 0);

  return origins.length > 0 ? origins : null;
}

/**
 * Decide whether `origin` may talk to this API.
 *
 * With no configured list, only loopback origins are allowed. That keeps
 * development frictionless without making a misconfigured or wildcarded
 * production deployment accept credentialed requests from anywhere on the
 * internet.
 */
export function isOriginAllowed(
  origin: string | undefined,
  allowed: string[] | null,
): boolean {
  if (allowed !== null) {
    return allowed.includes(origin?.replace(/\/$/, "") ?? "");
  }

  return origin !== undefined && LOOPBACK_ORIGIN.test(origin);
}

/**
 * Build the `origin` option for `cors`.
 *
 * A function rather than a string or `true`, because the two readable-looking
 * options are both wrong here:
 *
 * - `"*"` — sent alongside `Access-Control-Allow-Credentials: true`, which the
 *   browser rejects. This is the failure that started it.
 * - `true` — reflects any origin unconditionally, so a wildcarded `CORS_ORIGIN`
 *   would accept credentialed requests from any site, letting a page on
 *   another origin call this API with the user's cookie attached.
 */
export function resolveCorsOrigin(configured: string | undefined) {
  const allowed = parseAllowedOrigins(configured);

  return (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    /*
     * No `Origin` header means the request is not a browser cross-origin
     * request — curl, Postman, a server-to-server call, a test client. CORS
     * does not apply, so the correct answer is "allow" and simply omit the
     * CORS headers.
     *
     * Erroring here instead turns every non-browser request into a 500, which
     * is how this was originally caught: the routing integration suite sends no
     * `Origin` and every request started failing.
     */
    if (origin === undefined) {
      callback(null, true);
      return;
    }

    if (isOriginAllowed(origin, allowed)) {
      callback(null, true);
      return;
    }

    callback(new Error(`Origin ${origin} is not allowed by CORS`));
  };
}

/**
 * The full `cors` options, so `app.ts` stays a list of middleware rather than
 * a place CORS policy is decided.
 */
export function buildCorsOptions(configured: string | undefined): CorsOptions {
  return {
    origin: resolveCorsOrigin(configured),
    /*
     * Required: login sets an httpOnly cookie and the frontend reads it. The
     * frontend also sends `Authorization: Bearer`, so this is belt and braces —
     * but dropping it would break the proxy's cookie read on the server.
     */
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    maxAge: 600,
    /*
     * `allowedHeaders` is deliberately left unset. When it is absent the `cors`
     * package reflects whatever the browser asked for in
     * `Access-Control-Request-Headers`, which is what makes the preflight pass
     * for `Authorization` and any future header. Pinning a fixed list instead
     * fails the preflight the first time a client sends something new — and
     * that failure looks exactly like the request never being made.
     */
    optionsSuccessStatus: STATUS_CODE.NO_CONTENT,
  };
}