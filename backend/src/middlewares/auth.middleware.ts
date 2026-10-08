/**
 * @author aliasgarbootwala@gmail.com
 */

import { Request, Response, NextFunction } from "express";
import { resolveToken, verifyToken } from "../utils/token.js";
import { STATUS_CODE } from "../constants/statusCode.js";
import { setRequestUserId } from "../utils/requestContext.js";
import { BlacklistToken } from "../models/blacklistToken.model.js";

export interface AuthRequest extends Request {
  user?: {
    userId: string;
  };
}

export const authMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const token = resolveToken(req);

    if (!token) {
      return res
        .status(STATUS_CODE.UNAUTHORIZED)
        .json({ message: "Authentication required" });
    }

    const decoded = verifyToken(token);

    /*
     * A valid signature is not enough — the token also has to still be live.
     *
     * Without this check, logout is decorative: it writes the token to the
     * blacklist but nothing ever reads it, so a stolen or borrowed JWT keeps
     * working until it expires on its own. This is the one place every
     * authenticated route passes through, which is what keeps a revoked token
     * from being honoured on `/recommendations` while being rejected on
     * `/user/profile`.
     */
    BlacklistToken.exists({ token })
      .then((blacklisted) => {
        if (blacklisted) {
          return res
            .status(STATUS_CODE.UNAUTHORIZED)
            .json({ message: "Token has been revoked" });
        }

        req.user = {
          userId: decoded.userId,
        };

        /* Attach to the request context so later logs name the caller. */
        setRequestUserId(decoded.userId);

        next();
      })
      .catch(next);
  } catch (error) {
    return res
      .status(STATUS_CODE.UNAUTHORIZED)
      .json({ message: "Invalid token" });
  }
};
