/**
 * @author aliasgarbootwala@gmail.com
 */

import { STATUS_CODE } from "../constants/statusCode.js";
import ApiError from "../utils/apiError.js";
import { Response } from "express";

export default class BaseController {
  success(res: Response, data: any, status = STATUS_CODE.OK) {
    res.status(status).json({
      data,
      success: true,
    });
  }

  error(
    res: Response,
    message: string,
    status = STATUS_CODE.INTERNAL_SERVER_ERROR,
  ) {
    res.status(status).json({
      message,
      success: false,
    });
  }

  /**
   * Turns a thrown value into a response.
   *
   * An `ApiError` already carries the status it intended (401 for a bad
   * login, 404 for a missing comment), so it is honoured. Everything
   * else is treated as an unexpected fault and becomes a 500.
   *
   * Without this, every controller catch block flattened deliberate
   * errors to 500 — a wrong password answered 500 instead of 401.
   */
  handleError(res: Response, error: unknown) {
    if (error instanceof ApiError) {
      return this.error(res, error.message, error.statusCode);
    }

    return this.error(
      res,
      error instanceof Error ? error.message : String(error),
      STATUS_CODE.INTERNAL_SERVER_ERROR,
    );
  }
}
