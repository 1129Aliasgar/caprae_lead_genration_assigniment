/**
 * @author aliasgarbootwala@gmail.com
 *
 * HTTP surface for profile extraction and lead ranking.
 *
 * Mounted as two controllers sharing one service: capture a profile, then act
 * on it. In `inversify-express-utils` a controller *is* the router — the class
 * decorator sets the base path and the method decorators register routes under
 * it — so there is no separate route layer.
 *
 * Every handler is thin: validate, delegate, shape. No business rule lives
 * here, which is what lets the service be exercised directly without HTTP.
 */

import { httpGet, httpPatch, httpPost, controller } from "inversify-express-utils";
import { inject } from "inversify";
import { Request, Response } from "express";
import { TYPES } from "../config/types.js";
import BaseController from "./base.controller.js";
import { STATUS_CODE } from "../constants/statusCode.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import {
  extractProfileSchema,
  getRecommendationsSchema,
  leadIdParamSchema,
  updateProfileSchema,
} from "../validators/recommendation.validator.js";
import RecommendationService from "../services/recommendation.service.js";
import {
  PROFILE_BASE_ROUTE,
  RECOMMENDATIONS_BASE_ROUTE,
} from "../constants/routes.constants.js";

@controller(PROFILE_BASE_ROUTE)
export class ProfileController extends BaseController {
  @inject(TYPES.RecommendationService)
  recommendationService!: RecommendationService;

  /**
   * POST /api/v1/profile/extract
   *
   * Runs extraction and stores the profile. Returns it so the user can see
   * what was read, with a confidence per field.
   */
  @httpPost("/extract", authMiddleware)
  async extract(req: Request, res: Response) {
    try {
      const { error, value } = extractProfileSchema.validate(req.body);

      if (error) {
        return this.error(
          res,
          error.details[0].message,
          STATUS_CODE.BAD_REQUEST,
        );
      }

      const result = await this.recommendationService.extractProfile(
        req.user!.userId,
        value.resumeText,
      );

      return this.success(res, result, STATUS_CODE.OK);
    } catch (error) {
      return this.handleError(res, error);
    }
  }

  /**
   * PATCH /api/v1/profile
   *
   * Correct individual fields of the stored profile — the answer to "the
   * extractor got this one thing wrong".
   *
   * PATCH rather than PUT because the client sends only what changed, and a PUT
   * body that omitted a field would read as "clear it". The service applies a
   * partial `$set`, so an omitted key leaves the stored value untouched.
   *
   * Returns the profile as saved rather than an acknowledgement, so the client
   * renders the server's version instead of its own optimistic guess.
   */
  @httpPatch("/", authMiddleware)
  async updateProfile(req: Request, res: Response) {
    try {
      const { error, value } = updateProfileSchema.validate(req.body);

      if (error) {
        return this.error(
          res,
          error.details[0].message,
          STATUS_CODE.BAD_REQUEST,
        );
      }

      const profile = await this.recommendationService.updateProfile(
        req.user!.userId,
        value,
      );

      return this.success(res, { profile }, STATUS_CODE.OK);
    } catch (error) {
      return this.handleError(res, error);
    }
  }
}

@controller(RECOMMENDATIONS_BASE_ROUTE)
export class RecommendationController extends BaseController {
  @inject(TYPES.RecommendationService)
  recommendationService!: RecommendationService;

  /**
   * POST /api/v1/recommendations
   *
   * Ranked leads with `scoreBreakdown`, `whyMatched` and `tier` on each.
   *
   * POST rather than GET because `topN` changes how much work the database
   * does, and a GET with a body is not cacheable in any way worth relying on.
   */
  @httpPost("/", authMiddleware)
  async recommendations(req: Request, res: Response) {
    try {
      const { error, value } = getRecommendationsSchema.validate(req.body);

      if (error) {
        return this.error(
          res,
          error.details[0].message,
          STATUS_CODE.BAD_REQUEST,
        );
      }

      const leads = await this.recommendationService.getRecommendations({
        userId: req.user!.userId,
        topN: value.topN,
      });

      return this.success(res, { leads, count: leads.length }, STATUS_CODE.OK);
    } catch (error) {
      return this.handleError(res, error);
    }
  }

  /**
   * GET /api/v1/recommendations/:leadId
   *
   * One lead, ranked by this user's rules. `404` covers both "no such lead"
   * and "does not match this user" — indistinguishable by design, so a lead
   * the user would never have been shown cannot be discovered by guessing ids.
   */
  @httpGet("/:leadId", authMiddleware)
  async leadDetail(req: Request, res: Response) {
    try {
      const { error, value } = leadIdParamSchema.validate(req.params);

      if (error) {
        return this.error(
          res,
          error.details[0].message,
          STATUS_CODE.BAD_REQUEST,
        );
      }

      const lead = await this.recommendationService.getLeadDetail({
        userId: req.user!.userId,
        leadId: value.leadId,
      });

      return this.success(res, { lead }, STATUS_CODE.OK);
    } catch (error) {
      return this.handleError(res, error);
    }
  }
}

export default RecommendationController;