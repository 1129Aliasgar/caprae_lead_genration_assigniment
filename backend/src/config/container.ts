/**
 * @author aliasgarbootwala@gmail.com
 */

import { Container } from "inversify";
import "reflect-metadata";
import { TYPES } from "./types.js";
import { env } from "./env.js";

// service
import AuthService from "../services/auth.service.js";
import RecommendationService from "../services/recommendation.service.js";
import ExtractionService from "../services/extraction.service.js";

// repository
import AuthRepository from "../repositories/auth.repository.js";
import RecommendationRepository from "../repositories/recommendation.repository.js";

// infrastructure
import Logger from "../utils/logger.js";
import MongoDatabase from "./database.js";
import ApiError from "../utils/apiError.js";


const container = new Container();

/*
 * Database bindings
 *
 * `toDynamicValue` rather than `.to(MongoDatabase)`. `MongoDatabase`'s
 * constructor takes a `mongoUri: string`, so a plain `.to()` binding makes
 * Inversify try to resolve `String` as a dependency and throw "No matching
 * bindings found for serviceIdentifier: String".
 *
 * That did not surface before because the dev script runs through `tsx`, which
 * uses esbuild and does not emit decorator metadata — so `design:paramtypes`
 * came back undefined and the constructor's parameter was silently dropped.
 * `tsc` (`npm run build`) and `ts-jest` both *do* emit it, so the app worked
 * under `tsx` and failed under `tsc`. Passing the value explicitly makes the
 * binding correct regardless of which transpiler runs it.
 */
container
  .bind(TYPES.Database)
  .toDynamicValue(() => new MongoDatabase(env.mongoUri))
  .inSingletonScope();

// Service bindings
container.bind(TYPES.AuthService).to(AuthService).inSingletonScope();
container
  .bind(TYPES.RecommendationService)
  .to(RecommendationService)
  .inSingletonScope();
container
  .bind(TYPES.ExtractionService)
  .to(ExtractionService)
  .inSingletonScope();

// Repository bindings
container.bind(TYPES.AuthRepository).to(AuthRepository).inSingletonScope();
container
  .bind(TYPES.RecommendationRepository)
  .to(RecommendationRepository)
  .inSingletonScope();

// Logger bindings
container.bind(TYPES.Logger).to(Logger).inSingletonScope();

/*
 * ApiError bindings
 *
 * `toDynamicValue` for the same reason as `TYPES.Database` above:
 * `ApiError`'s constructor declares five parameters, all with defaults
 * (`message`, `statusCode`, `errors`, `stack`, `data`, `success`), which
 * `design:paramtypes` records as `[String, Number, Array, String, null,
 * Boolean]`. A plain `.to()` binding therefore asks Inversify to resolve
 * `String`, and it throws "No matching bindings found for serviceIdentifier:
 * String".
 *
 * This went unnoticed because `tsx` (esbuild) does not emit decorator
 * metadata, so the parameters were invisible at runtime under `npm run dev`.
 * `tsc` and `ts-jest` both emit it, so the app worked in dev and failed on
 * build. Constructing with no arguments reproduces exactly what a bare `new
 * ApiError(...)` gives — every field defaults.
 *
 * The binding is retained because `AuthService` and `RecommendationService`
 * both inject `ApiError` and are written against it.
 */
container
  .bind(TYPES.ApiError)
  .toDynamicValue(() => new ApiError("", 0))
  .inSingletonScope();


export default container;
