/**
 * @author aliasgarbootwala@gmail.com
 *
 * Seeds the `jobleads` collection from the Hugging Face Datasets Server.
 *
 *   npm run seed                     # full dataset (~33k rows)
 *   npm run seed -- --limit=500      # demo slice, for a laptop
 *   npm run seed -- --offset=1000    # resume a partial run
 *
 * The run is idempotent. Every row is written with
 * `updateOne({ jobId }, { $set: doc }, { upsert: true })` in batches, so
 * re-running updates leads in place rather than duplicating them, and a run
 * that is interrupted halfway through can simply be started again.
 *
 * Connection comes from the same Inversify-bound `MongoDatabase` the app uses,
 * resolved out of the container — no second client, and `.env` is loaded by
 * importing the config module first.
 */

import "../../src/config/config.js";
import container from "../../src/config/container.js";
import { TYPES } from "../../src/config/types.js";
import { IDatabase } from "../../src/types/database.types.js";
import { JobLead } from "../../src/models/jobLead.model.js";
import {
  HfJobPostingRow,
  HfRowsResponse,
} from "../../src/types/huggingface.types.js";
import { env } from "../../src/config/env.js";
import {
  HF_DATASET_CONFIG,
  HF_DATASET_NAME,
  HF_DATASET_SPLIT,
  HF_DATASET_URL,
  HF_MAX_RETRIES,
  HF_PAGE_SIZE,
  HF_REQUEST_TIMEOUT_MS,
  HF_RETRY_BASE_DELAY_MS,
  HF_SEED_BATCH_SIZE,
  HF_SEED_PROGRESS_INTERVAL,
  MAX_SEED_LIMIT,
} from "../../src/constants/seeding.constants.js";
import {
  computeLeadQualityScore,
  extractSkills,
  normalizeLocation,
} from "../../src/utils/leadDerivation.js";

/**
 * Document shape written by the seed. Kept separate from the mongoose model so
 * the mapping layer stays type-checked independently of the schema.
 */
interface SeedJobLead {
  jobId: number;
  title: string;
  description: string;
  skillsDesc: string;
  companyId: number;
  minSalary: number;
  maxSalary: number;
  payPeriod: string;
  currency: string;
  formattedWorkType: string;
  formattedExperienceLevel: string;
  location: string;
  remoteAllowed: number;
  views: number;
  applies: number;
  jobPostingUrl: string;
  applicationUrl: string;
  listedTime: number;
  expiry: number;
  salaryMidpoint: number;
  leadQualityScore: number;
  normalizedLocation: string;
  skills: string[];
}

interface SeedOptions {
  limit: number;
  offset: number;
}

/**
 * Coerce a nullable dataset number to a usable value.
 *
 * `NaN` guards against `JSON.parse` handing us a string where the feature
 * spec says float64 — anything non-finite falls through to the default rather
 * than poisoning an aggregation with `NaN`, which Mongo silently drops.
 */
function toNumber(value: number | null, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function toText(value: string | null): string {
  return typeof value === "string" ? value : "";
}

/**
 * A dataset row's salary fields are independently nullable, and `med_salary`
 * is present even when the min/max pair is not. Prefer the stated range,
 * fall back to the median, so a lead is not treated as unpaid just because
 * the source only published one of the three.
 */
function resolveSalary(row: HfJobPostingRow): {
  minSalary: number;
  maxSalary: number;
  salaryMidpoint: number;
} {
  const minSalary = toNumber(row.min_salary);
  const maxSalary = toNumber(row.max_salary);
  const medSalary = toNumber(row.med_salary);

  if (minSalary > 0 || maxSalary > 0) {
    return {
      minSalary,
      maxSalary,
      salaryMidpoint: (minSalary + maxSalary) / 2,
    };
  }

  return { minSalary: 0, maxSalary: 0, salaryMidpoint: medSalary };
}

/**
 * `remote_allowed` is 1/0-or-null in the source. Unknown stays 0 so the lead
 * fails the `remoteOnly` hard filter rather than passing on an assumption.
 */
function resolveRemoteAllowed(row: HfJobPostingRow): number {
  return toNumber(row.remote_allowed) > 0 ? 1 : 0;
}

/**
 * Map one dataset row onto the seed document.
 *
 * Returns null for rows that cannot be keyed — `job_id` is the upsert key, so
 * a row without one is unusable rather than merely incomplete.
 */
function mapRow(row: HfJobPostingRow): SeedJobLead | null {
  if (typeof row.job_id !== "number" || !Number.isFinite(row.job_id)) {
    return null;
  }

  const title = toText(row.title);

  if (!title) {
    return null;
  }

  const description = toText(row.description);
  const skillsDesc = toText(row.skills_desc);
  const location = toText(row.location);
  const views = toNumber(row.views);
  const applies = toNumber(row.applies);

  return {
    jobId: row.job_id,
    title,
    description,
    skillsDesc,
    companyId: toNumber(row.company_id),
    ...resolveSalary(row),
    payPeriod: toText(row.pay_period),
    currency: toText(row.currency),
    formattedWorkType: toText(row.formatted_work_type),
    formattedExperienceLevel: toText(row.formatted_experience_level),
    location,
    remoteAllowed: resolveRemoteAllowed(row),
    views,
    applies,
    jobPostingUrl: toText(row.job_posting_url),
    applicationUrl: toText(row.application_url),
    listedTime: toNumber(row.listed_time),
    expiry: toNumber(row.expiry),
    leadQualityScore: computeLeadQualityScore(applies, views),
    normalizedLocation: normalizeLocation(location),
    skills: extractSkills(skillsDesc, description),
  };
}

/**
 * How long to wait before the next page, in seconds.
 *
 * The datasets-server rate-limits by request volume, and paging 33,000 rows
 * back-to-back trips it within the first few thousand — the run then spends
 * its life in retry backoff and eventually gives up. A fixed pause between
 * pages keeps the request rate under the threshold instead of colliding with
 * it and recovering.
 *
 * Randomised by up to ±30% so a re-run does not land on exactly the same
 * timing pattern as the last one and get throttled again immediately.
 */
function pacingDelayMs(): number {
  const jitter = 0.7 + Math.random() * 0.6;

  return env.dataset.requestIntervalMs * jitter;
}

/** Pause between pages. */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Read `Retry-After` as a number of milliseconds.
 *
 * Hugging Face sends it on 429. Honouring the server's own instruction beats
 * guessing a backoff, and is the difference between backing off for exactly as
 * long as asked and hammering it again a second too early.
 */
function retryAfterMs(response: Response): number | null {
  const header = response.headers.get("retry-after");

  if (!header) {
    return null;
  }

  const seconds = Number(header);

  if (!Number.isFinite(seconds) || seconds < 0) {
    return null;
  }

  return seconds * 1000;
}

/**
 * Fetch one page of rows.
 *
 * Retries with exponential backoff and jitter, and honours `Retry-After`. The
 * datasets-server rate-limits aggressively under sequential paging, so a bare
 * `fetch` drops the run on the first 429 — and a fixed backoff trips it again
 * immediately, which is what limited the previous version to ~3,500 rows.
 */
async function fetchPage(offset: number): Promise<HfRowsResponse> {
  const url =
    `${HF_DATASET_URL}` +
    `?dataset=${encodeURIComponent(HF_DATASET_NAME)}` +
    `&config=${HF_DATASET_CONFIG}` +
    `&split=${HF_DATASET_SPLIT}` +
    `&offset=${offset}` +
    `&length=${HF_PAGE_SIZE}`;

  let lastError: unknown;

  for (let attempt = 1; attempt <= HF_MAX_RETRIES; attempt++) {
    let retryAfter: number | null = null;

    try {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(HF_REQUEST_TIMEOUT_MS),
      });

      if (!response.ok) {
        /*
         * Capture the server's requested delay before throwing, so the catch
         * block can use it. A 429 that arrives without `Retry-After` still
         * falls back to exponential backoff below.
         */
        retryAfter = retryAfterMs(response);

        throw new Error(
          `datasets-server responded ${response.status} ${response.statusText}`,
        );
      }

      /*
       * The response is JSON but not a typed contract — `unknown` is asserted
       * here rather than at the call site so a schema change surfaces as a
       * failed cast instead of silently producing undefined fields.
       */
      return (await response.json()) as HfRowsResponse;
    } catch (error) {
      lastError = error;

      const isLastAttempt = attempt === HF_MAX_RETRIES;

      console.warn(
        `  ! page at offset=${offset} failed (attempt ${attempt}/${HF_MAX_RETRIES}): ${
          error instanceof Error ? error.message : String(error)
        }`,
      );

      if (isLastAttempt) {
        break;
      }

      /*
       * `Retry-After` wins when the server sent one. Otherwise exponential
       * backoff with jitter — the jitter stops many concurrent runs (or
       * retries) from re-colliding on the same schedule and getting throttled
       * as a group.
       */
      const delay =
        retryAfter ?? HF_RETRY_BASE_DELAY_MS * 2 ** (attempt - 1) * (0.7 + Math.random() * 0.6);

      await sleep(delay);
    }
  }

  throw new Error(
    `Failed to fetch offset=${offset} after ${HF_MAX_RETRIES} attempts: ${
      lastError instanceof Error ? lastError.message : String(lastError)
    }`,
  );
}

/**
 * Parse `--limit=N` / `--offset=N`.
 *
 * Both default to "the whole dataset". A non-numeric or negative flag is a
 * hard error rather than a silent fallback to unlimited — a typo'd `--limit`
 * that quietly seeds 33k rows into a dev database is worse than a failed
 * command.
 */
function parseArgs(argv: string[]): SeedOptions {
  let limit = MAX_SEED_LIMIT;
  let offset = 0;

  for (const arg of argv) {
    const match = /^--(limit|offset)=(\d+)$/.exec(arg);

    if (!match) {
      continue;
    }

    const value = Number.parseInt(match[2], 10);

    if (!Number.isFinite(value) || value < 0) {
      throw new Error(`Invalid value for ${match[1]}: ${match[2]}`);
    }

    if (match[1] === "limit") {
      limit = Math.min(value, MAX_SEED_LIMIT);
    } else {
      offset = value;
    }
  }

  return { limit, offset };
}

/** Batch upserts. One `bulkWrite` per `HF_SEED_BATCH_SIZE` documents. */
async function upsertBatch(batch: SeedJobLead[]): Promise<void> {
  await JobLead.bulkWrite(
    batch.map((doc) => ({
      updateOne: {
        filter: { jobId: doc.jobId },
        update: { $set: doc },
        upsert: true,
      },
    })),
    { ordered: false },
  );
}

async function seedLeads(options: SeedOptions): Promise<void> {
  console.log(
    `Seeding job leads from ${HF_DATASET_NAME} ` +
      `(offset=${options.offset}, limit=${options.limit})`,
  );

  let processed = 0;
  let written = 0;
  let skipped = 0;
  let batch: SeedJobLead[] = [];

  const flush = async (): Promise<void> => {
    if (batch.length === 0) {
      return;
    }

    await upsertBatch(batch);
    written += batch.length;
    batch = [];
  };

  /*
   * `offset` advances by the raw row count the server returned, not by
   * `HF_PAGE_SIZE`. They diverge whenever a page comes back short — near the
   * end of the dataset, or if the server caps `length` below what we asked
   * for — and advancing by a fixed stride would silently skip rows.
   */
  let cursor = options.offset;
  let pageNumber = 0;

  while (processed < options.limit) {
    /*
     * Pause *before* the request, not after. Pacing after would still fire the
     * first few requests back to back, which is enough to trip the limiter and
     * leave the run stuck in backoff.
     */
    if (pageNumber > 0) {
      await sleep(pacingDelayMs());
    }

    let page: HfRowsResponse;

    try {
      page = await fetchPage(cursor);
    } catch (error) {
      /*
       * Report where to resume and stop cleanly rather than aborting into a
       * stack trace. Every page already written is committed, so re-running
       * with `--offset=<cursor>` continues exactly where this left off — the
       * upsert makes the overlap harmless.
       */
      console.error(
        `\nStopped after ${written} leads at offset ${cursor} ` +
          `(page ${pageNumber}).`,
      );
      console.error(`Reason: ${error instanceof Error ? error.message : String(error)}`);
      console.error(`Resume with: npm run seed -- --offset=${cursor}`);

      await flush();

      process.exitCode = 1;

      return;
    }

    pageNumber++;

    if (page.rows.length === 0) {
      console.log("  - reached end of dataset");
      break;
    }

    for (const entry of page.rows) {
      if (processed >= options.limit) {
        break;
      }

      const doc = mapRow(entry.row);

      if (doc === null) {
        skipped++;
      } else {
        batch.push(doc);
      }

      processed++;

      if (batch.length >= HF_SEED_BATCH_SIZE) {
        await flush();
      }
    }

    if (processed % HF_SEED_PROGRESS_INTERVAL < page.rows.length) {
      console.log(
        `  ... ${processed} rows read, ${written} written, ${skipped} skipped`,
      );
    }

    cursor += page.rows.length;
  }

  await flush();

  console.log(
    `Done. ${written} leads upserted, ${skipped} skipped ` +
      `(${processed} rows read).`,
  );
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));

  const db = container.get<IDatabase>(TYPES.Database);
  await db.connect();

  /*
   * `autoIndex` is off for this app (see `config/database.ts`), so declaring
   * the indexes on the schema builds nothing on its own. Sync them explicitly
   * here, or the unique constraint on `jobId` that keeps the upsert idempotent
   * would not exist.
   */
  await JobLead.syncIndexes();

  try {
    await seedLeads(options);
  } finally {
    await db.disconnect();
  }
}

main().catch((error) => {
  console.error("Seed failed:", error);
  process.exit(1);
});