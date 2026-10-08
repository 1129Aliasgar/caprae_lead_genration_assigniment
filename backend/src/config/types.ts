/**
 * @author aliasgarbootwala@gmail.com
 */

export const TYPES = {
  // Controller Types
  AuthController: Symbol.for("AuthController"),
  ProfileController: Symbol.for("ProfileController"),
  RecommendationController: Symbol.for("RecommendationController"),

  // Service Types
  AuthService: Symbol.for("AuthService"),
  RecommendationService: Symbol.for("RecommendationService"),
  ExtractionService: Symbol.for("ExtractionService"),

  // Repository Types
  AuthRepository: Symbol.for("AuthRepository"),
  RecommendationRepository: Symbol.for("RecommendationRepository"),

  // Infrastructure Types
  Database: Symbol.for("Database"),
  Logger: Symbol.for("Logger"),
  ApiError: Symbol.for("ApiError"),

  // middleware
  AuthMiddleware: Symbol.for("AuthMiddleware"),
  RateLimiter: Symbol.for("RateLimiter"),
};
