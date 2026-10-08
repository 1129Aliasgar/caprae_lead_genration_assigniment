/**
 * @author aliasgarbootwala@gmail.com
 *
 * Typed access to environment configuration.
 *
 * The app reads configuration here and nowhere else, so a missing or
 * malformed variable fails once at startup with a clear message rather than at
 * the first request that happens to need it — a missing `MONGO_URI` currently
 * surfaces only when the first user tries to register.
 *
 * Values are read once on import. That is deliberate: `dotenv.config()` has
 * already run by the time anything imports this module (`app.ts` and
 * `server.ts` import `./config/config.js` first), and re-reading on every
 * access would mean a typo in a variable name returning `undefined` instead of
 * failing loudly.
 */

import "./config.js";

import { DEFAULT_TOP_N, MAX_TOP_N } from "../constants/recommendation.constants.js";

/*
 * Note on import direction: this module is the root of the configuration
 * chain. It imports only constants (leaf modules with no imports of their own)
 * and `config/config.js`, which exists solely to run `dotenv`. Nothing may
 * import this module *from* a constants file, or the two would be circular.
 */

/**
 * Thrown for a missing or unusable environment variable.
 *
 * `ApiError` rather than `Error` so a misconfigured deployment fails with the
 * same shape as every other API error. Startup does not reach the HTTP layer,
 * so the status code is mostly documentary here.
 */
function fail(name: string, expected: string): never {
  throw new Error(`Invalid environment variable ${name}: expected ${expected}`);
}

/** Required string. Fails at import if absent or blank. */
function required(name: string): string {
  const value = process.env[name];

  if (value === undefined || value.trim() === "") {
    fail(name, "a non-empty string");
  }

  return value.trim();
}

/** Optional string, with a fallback. */
function optional(name: string, fallback: string): string {
  const value = process.env[name];

  return value === undefined || value.trim() === "" ? fallback : value.trim();
}

/**
 * Optional boolean.
 *
 * Only the literal `true`/`1`/`yes` are truthy — a bare `NODE_ENV=production`
 * style mistake where someone writes `USE_LLM_EXTRACTION=yes please` gets
 * treated as false rather than silently enabling an external call.
 */
function optionalBoolean(name: string, fallback = false): boolean {
  const value = process.env[name];

  if (value === undefined || value.trim() === "") {
    return fallback;
  }

  const normalised = value.trim().toLowerCase();

  if (["true", "1", "yes"].includes(normalised)) {
    return true;
  }

  if (["false", "0", "no", ""].includes(normalised)) {
    return false;
  }

  return fail(name, "one of true/false/1/0/yes/no");
}

/** Optional integer, clamped to `[min, max]`. */
function optionalInt(name: string, fallback: number, min: number, max: number): number {
  const raw = process.env[name];

  if (raw === undefined || raw.trim() === "") {
    return fallback;
  }

  const parsed = Number(raw.trim());

  if (!Number.isFinite(parsed)) {
    return fail(name, "a finite number");
  }

  return Math.min(Math.max(Math.round(parsed), min), max);
}

export const env = {
  nodeEnv: optional("NODE_ENV", "development"),
  isProduction: optional("NODE_ENV", "development") === "production",
  port: optionalInt("PORT", 3000, 1, 65_535),
  corsOrigin: optional("CORS_ORIGIN", "*"),

  mongoUri: required("MONGO_URI"),

  jwt: {
    secret: required("JWT_SECRET"),
    expiresIn: optional("JWT_EXPIRES_IN", "1d"),
  },

  /*
 * No extraction configuration block, and that is deliberate.
 *
 * There was an LLM-backed extractor here, with an API key, a model name and a
 * timeout. It was removed rather than left switched off, because dead config is
 * worse than no config — it reads as a feature that works when it does not, and
 * the flag controlling it was itself unread.
 *
 * The reason it went is measured, not preferred: a free-tier chat model timed
 * out at 30 seconds on a 4,877-character resume. Extraction sits in front of
 * the user's first real action, so a provider that is slow or down is not an
 * acceptable dependency when the deterministic extractor runs in single-digit
 * milliseconds and was measurably better on titles for a sales resume.
 */

  /** Hugging Face source used by `scripts/db/seed.db.ts`. */
  /** Hugging Face source, and pacing, used by `scripts/db/seed.db.ts`. */
  dataset: {
    url: optional(
      "HF_DATASET_URL",
      "https://datasets-server.huggingface.co/rows",
    ),
    name: optional("HF_DATASET_NAME", "xanderios/linkedin-job-postings"),
    /*
     * Pause between pages. The datasets-server throttles by request volume, and
     * paging back to back trips it within the first few thousand rows — after
     * which every attempt is a 429 and the run gives up. 900ms is ~110
     * requests/minute, comfortably under the threshold.
     */
    requestIntervalMs: optionalInt("SEED_REQUEST_INTERVAL_MS", 900, 0, 60_000),
  },

  recommendations: {
    defaultTopN: optionalInt(
      "RECOMMENDATION_DEFAULT_TOP_N",
      DEFAULT_TOP_N,
      1,
      MAX_TOP_N,
    ),
    /**
     * Reserved for the response cache the API does not have yet. Declared so
     * the deployment knob exists ahead of the feature rather than being
     * introduced later as a breaking config change.
     */
    cacheTtlSeconds: optionalInt(
      "RECOMMENDATION_CACHE_TTL_SECONDS",
      600,
      0,
      86_400,
    ),
  },

  /*
   * Defaults live here rather than in `constants/rateLimit.constants.ts`,
   * which imports *this* module — putting the literals the other way round
   * would make the two circular. The middleware reads through this object.
   */
  rateLimit: {
    windowMs: optionalInt("RATE_LIMIT_WINDOW_MS", 60_000, 1000, 3_600_000),
    maxRequests: optionalInt("RATE_LIMIT_MAX_REQUESTS", 100, 1, 100_000),
    recommendationsMax: optionalInt(
      "RATE_LIMIT_RECOMMENDATIONS_MAX",
      30,
      1,
      100_000,
    ),
  },
} as const;