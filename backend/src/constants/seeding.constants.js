/**
 * @author aliasgarbootwala@gmail.com
 *
 * Source and paging configuration for `scripts/db/seed.db.ts`.
 *
 * The endpoint is public — no auth header, no token. It returns at most 100
 * rows per call regardless of the `length` asked for, which is why
 * `HF_PAGE_SIZE` is 100 and why paging is offset-based rather than
 * cursor-based.
 */
/** Hugging Face Datasets Server row endpoint. */
export const HF_DATASET_URL = "https://datasets-server.huggingface.co/rows";
/** Dataset slug, and the config/split the rows endpoint expects. */
export const HF_DATASET_NAME = "xanderios/linkedin-job-postings";
export const HF_DATASET_CONFIG = "default";
export const HF_DATASET_SPLIT = "train";
/** Hard server-side page size. */
export const HF_PAGE_SIZE = 100;
/** Rows written per bulkWrite call. */
export const HF_SEED_BATCH_SIZE = 500;
/** Progress line interval, in rows. */
export const HF_SEED_PROGRESS_INTERVAL = 500;
/**
 * Per-request timeout. The endpoint is slow and occasionally stalls; without
 * this a hung socket leaves the seed sitting there forever.
 */
export const HF_REQUEST_TIMEOUT_MS = 30_000;
/**
 * Default pause between pages, in milliseconds.
 *
 * Overridable through `SEED_REQUEST_INTERVAL_MS` — `config/env.ts` reads it and
 * the seed uses the configured value, so a throttled network or a cached
 * response can be handled without a code change.
 *
 * The pacing is the single most important number for a full seed. Hugging Face
 * throttles by request volume, and paging 33,000 rows back-to-back trips it
 * within the first few thousand — after which every attempt is a 429, the run
 * burns through its retries, and it gives up around row 3,500.
 *
 * 100 rows per page at 900ms is ~110 requests/minute, which sits comfortably
 * under the threshold. A full run takes ~5 minutes, a fine trade for not losing
 * 90% of the dataset.
 */
export const HF_REQUEST_INTERVAL_MS = 900;
/** Attempts per page before the seed gives up and exits non-zero. */
export const HF_MAX_RETRIES = 6;
/**
 * Base backoff between retries, doubling per attempt.
 *
 * 6 attempts from 1s is 1+2+4+8+16+32 = ~63s of total patience for a single
 * page, which is what it takes for a rate limit to clear. The previous 3
 * attempts gave up after 3 seconds, which is shorter than most rate-limit
 * windows and therefore failed while still being throttled.
 */
export const HF_RETRY_BASE_DELAY_MS = 1_000;
/** Ceiling on `topN`-like flags, so `--limit=99999999` cannot be pasted in. */
export const MAX_SEED_LIMIT = 1_000_000;
