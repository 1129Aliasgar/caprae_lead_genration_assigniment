/**
 * @author aliasgarbootwala@gmail.com
 *
 * Rate limits for the recommendation endpoints.
 *
 * Applies to the whole `/api/v1/recommendations` and `/api/v1/profile` space,
 * keyed by authenticated user where a token is present and by IP otherwise.
 *
 * The key detail is *who* the limit is counted against. Keying purely on IP
 * would put everyone behind one NAT on a shared budget — an office, a campus,
 * a mobile carrier — so a hundred colleagues browsing leads would lock each
 * other out. Keying on the user id where one is available avoids that, while
 * still bounding anonymous traffic, which has no user id to count against.
 */

import rateLimit, { Options } from "express-rate-limit";
import { Request, Response } from "express";
import {
  RATE_LIMIT_WINDOW_MS,
  RATE_LIMIT_MAX_REQUESTS,
  RATE_LIMIT_RECOMMENDATIONS_MAX,
} from "../constants/rateLimit.constants.js";
import { STATUS_CODE } from "../constants/statusCode.js";

/**
 * Identify the caller.
 *
 * `req.user` is only populated by `authMiddleware`, so this is checked rather
 * than assumed — the limiter is mounted ahead of the routes but the middleware
 * runs per-route.
 *
 * Falls back to the client IP, which `express-rate-limit` handles
 * consistently across IPv4 and IPv6 (v7 keys the whole address, not a /64
 * prefix, which is the documented recommendation).
 */
function keyGenerator(req: Request): string {
  return req.user?.userId ?? req.ip ?? "unknown";
}

/**
 * Shared shape. Only `max` differs between the two limiters.
 */
function baseOptions(max: number): Partial<Options> {
  return {
    windowMs: RATE_LIMIT_WINDOW_MS,
    limit: max,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    keyGenerator,
    /*
     * The library's default message is plain text, which would bypass the
     * `{ success: false }` envelope every other error in this API uses. Left
     * at the default the client would have to handle two response shapes.
     */
    handler: (_req: Request, res: Response) => {
      res.status(STATUS_CODE.TOO_MANY_REQUESTS).json({
        message: "Too many requests, please try again later",
        success: false,
      });
    },
  };
}

/** Applied to `/api/v1/recommendations` — the expensive, aggregate-heavy one. */
export const recommendationRateLimiter = rateLimit(
  baseOptions(RATE_LIMIT_RECOMMENDATIONS_MAX),
);

/** Applied to `/api/v1/profile` — extraction runs regexes over the resume. */
export const profileRateLimiter = rateLimit(
  baseOptions(RATE_LIMIT_MAX_REQUESTS),
);