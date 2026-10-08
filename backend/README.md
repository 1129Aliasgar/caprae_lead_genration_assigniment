# Backend — LeadMatch API

Ranking engine and resume extraction. See the [root README](../README.md) for the whole picture.

```bash
npm install
cp .example.env .env            # MONGO_URI + JWT_SECRET are required
npm run seed:leads -- --limit=2000
npm run dev                     # http://localhost:5000
npm run typecheck
```

## How it's laid out

Controllers are thin — they validate, call a service, and shape the response. They *are* the routers (`inversify-express-utils`). All the logic sits in services, all the queries in repositories, and `config/container.ts` is the only place things get wired together.

## Extraction

Regex and a curated word list (`constants/extraction.dictionary.ts`). No API call, no key, no rate limit — it runs in a few milliseconds.

It reads titles, skills, locations, years of experience and education. Each field gets a confidence score, and `PATCH /api/v1/profile` lets a user fix anything it got wrong. A corrected field is marked high-confidence automatically.

**Why not an LLM?** I built one and removed it. A free-tier model timed out at 30 seconds on a 4,877-character resume, and on a sales resume it returned one wrong title — which then filtered that user down to an empty list. Faster and more accurate than the alternative.

The real cost of the current version: a title it doesn't know produces no match. That list covers the common job families in this dataset, but it isn't everything.

## Ranking

A MongoDB aggregation does the filtering, scoring, sorting and cutting, so only `topN` documents ever come back.

Hard filters (derived from the profile) remove ineligible leads. Six weighted dimensions then rank what's left. The breakdown is built in `$project`, so the numbers shown to a user are literally the numbers the database sorted on.

## Known bug

The salary floor compares raw `maxSalary` values, which arrive in hourly, weekly, monthly and yearly units. A $63/hr posting (~$131k/yr) gets filtered out by a $100k floor because 63 < 100000.

Roughly 900 leads are affected. The fix is to annualise at seed time in `utils/leadDerivation.ts`, not to change the threshold.

## Configuration

Everything reads through `src/config/env.ts` — nothing reads `process.env` inline.

| | |
| --- | --- |
| `MONGO_URI` | **required** |
| `JWT_SECRET` | **required** |
| `PORT` | 3000 |
| `CORS_ORIGIN` | comma-separated; `*` means localhost only |
| `SEED_REQUEST_INTERVAL_MS` | 900 — HuggingFace throttles without pacing |

## Verification

`npm run verify:pipeline` drives the whole API against a live database and asserts the scores are non-zero and correctly ordered. Needs the server running.

This is the only check that can catch a ranking bug. Typecheck and build cannot — all five bugs I found in this project passed both.