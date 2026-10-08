# LeadMatch

Recommendation engine for job leads. A user pastes their resume, the backend
extracts a structured profile from it, and that profile is matched against
33,000 seeded leads by hard filters plus weighted scoring. Every returned lead
carries the numbers that put it where it did.

| | |
| --- | --- |
| **Backend** | Node.js, Express 4, TypeScript, Inversify, Mongoose 9, Joi — `backend/` |
| **Frontend** | Next.js 16 App Router, React 19, Tailwind v4, shadcn/ui — `frontend/` |
| **Database** | MongoDB |
| **Data** | [xanderios/linkedin-job-postings](https://huggingface.co/datasets/xanderios/linkedin-job-postings) via the public Datasets Server |

---

## The problem this solves

A list of 33,000 job leads is not a list of opportunities — it is a wall. The
question a job seeker actually has is not "what jobs exist" but "which twenty of
these are worth my morning". SaaSquatch solves the sourcing problem. This tool
solves the *triage* problem that sits immediately after it: given a pile of
leads, which ones are worth a human's time?

Three things make that work in practice:

**Hard filters remove what is not eligible, scoring ranks what is.** Someone
whose resume is ten years deep should not be shown an internship posting at 40k
and asked to rate it. Those are eligibility constraints, not preferences. Among
leads that qualify, six weighted dimensions decide the order.

**Every score is explainable.** A ranking nobody can interrogate is one nobody
trusts, so each lead returns `scoreBreakdown` (the six dimensions), `whyMatched`
(human-readable reasons), and a `tier`. The numbers shown are the numbers the
database sorted on, not a re-derivation.

**The profile is the only input, and it is editable.** There is no second
preferences screen and no confirmation gate. Extraction stores what it found and
returns it with a confidence per field, and each field can then be corrected in
place via `PATCH /profile`. The ranking reads whatever is stored, so a correction
takes effect on the next request — including `yearsOfExperience`, which sets the
salary floor and can change which leads appear at all.

---

## How it works

```text
  resume text
       │
       ▼
┌────────────────────┐
  │  Tier-1 extraction │   regex + curated dictionary, in-process.
  │  → profile           Confidence per field. No network, no key.
  └──────────┬─────────┘
        ▼
  ┌────────────────────┐
  │  user edits fields │   per-field PATCH. The weak fields are flagged.
  └──────────┬─────────┘   Re-ranking takes effect immediately.
             │
        ▼
  ┌────────────────────┐
  │  $match             │   hard filters — eligibility, all derived
  │  $addFields ×6      │   from titles, locations, skills and years
  │  finalScore         │   Σ (weight × score), weights sum to 1.0
  │  $sort → $limit     │   ranking happens in Mongo; only topN crosses the wire
  └──────────┬─────────┘
             │
             ▼
  RankedLead[]  ← scoreBreakdown · whyMatched · tier A/B/C
```

The profile maps onto matching the way it would if a person did it by hand:

| Profile field | Becomes |
| --- | --- |
| `titles` | target job titles — a hard filter, then scored |
| `locations` | preferred locations; the literal token `remote` becomes a remote-only filter |
| `skills` | skill overlap, as a fraction of the profile's skills found in the posting |
| `yearsOfExperience` | a seniority band, which sets both an experience filter and a salary floor |
| `educationLevel` | carried on the profile, surfaced in the UI, not scored |

### Scoring dimensions

| Dimension | 1.0 when | Otherwise |
| --- | --- | --- |
| Title match | exact match on a profile title | 0.7 partial, else 0.2 |
| Skill overlap | — | fraction of profile skills present in the posting |
| Salary fit | midpoint above the seniority band's floor | 0.4 |
| Location fit | remote | 0.9 preferred location, else 0.3 |
| Experience fit | lead's level matches or exceeds the profile's band | 0.5 |
| Lead quality | — | `applies / views`, capped at 1; 0.5 when there are no views |

`finalScore` is the weighted mean of those six, using the shipped weights
(`DEFAULT_WEIGHTS`, which sum to 1.0). Tiers: **A** ≥ 0.8, **B** ≥ 0.6, else
**C**.

Every hard filter is conditional. A profile with no titles simply omits the
title filter rather than emitting an empty one — `$in: []` matches nothing in
Mongo, so an empty clause would return zero results with no explanation.

---

## Running it

Two terminals.

```bash
# 1 — API
cd backend
npm install
cp .example.env .env              # MONGO_URI and JWT_SECRET are required
npm run seed -- --limit=3000       # ~30s; the full 33k takes ~5 min
npm run dev                        # http://localhost:5000

# 2 — Frontend
cd frontend
npm install
cp .example.env.local .env.local
npm run dev                        # http://localhost:3000
```

Or with Docker, for a clean local stack:

```bash
docker compose up -d               # mongo + api + web
docker compose down -v             # stop and wipe the database
```

### Verification

```bash
cd backend  && npm run typecheck
cd frontend && npm run lint && npm run build

# and the one that matters — the pipeline against a real database
cd backend
npm run seed:leads -- --limit=200
npm run dev                       # in another terminal
npm run verify:pipeline
```

`verify:pipeline` is the only check in the repo that can tell whether the
ranking is *numerically* correct. Typecheck, lint and build are all blind to
that: five bugs in this project passed every one of them, including one where
`finalScore` was `0.000` on every lead and the list still looked plausibly
ordered.

GitHub Actions runs all of it on every push (`.github/workflows/ci.yml`).

---

## CI/CD

`.github/workflows/ci.yml` runs two jobs on every push and pull request.

**`verify`** — backend typecheck, frontend lint, frontend build. Cheap, and it
catches the things static analysis is good at.

**`seed`** — spins up a MongoDB service container, seeds 200 leads, and runs
`verify:pipeline` against a live API. This job exists because the other one
cannot catch a ranking bug. It skips extraction, since a shared rate-limited
provider key would make the build fail for reasons unrelated to the code.

**Deployment** is not scripted here. Render and Netlify both build from the
repository on push, so pushing to `main` deploys. Set the OpenRouter key in
**Render's environment variables**, not in GitHub secrets — the CI secrets are
for CI, and nothing at runtime can read them.

---

## Seeding

```bash
npm run seed -- --limit=5000     # a working set
npm run seed --                  # all ~33,000 rows
npm run seed -- --offset=10000   # resume a partial run
```

Idempotent — every row is an `updateOne({ jobId }, { upsert: true })`, so
re-running updates in place rather than duplicating.

The Hugging Face datasets-server throttles by request volume. Paging back to
back trips it within the first few thousand rows and the run gives up, so the
seed paces requests (`SEED_REQUEST_INTERVAL_MS`, default 900ms), honours
`Retry-After`, and retries six times with jittered backoff. On persistent
failure it prints the exact `--offset` to resume from.

Derived fields computed at seed time — `salaryMidpoint`, `leadQualityScore`,
`normalizedLocation`, and a `skills` token array that makes skill overlap
computable in an aggregation.

---

## Configuration

Read through `src/config/env.ts`; nothing reads `process.env` inline.
`MONGO_URI` and `JWT_SECRET` are validated at startup, not at first request.

| Variable | Default | Purpose |
| --- | --- | --- |
| `MONGO_URI` | — | **required** |
| `JWT_SECRET` | — | **required** |
| `PORT` | `3000` | |
| `JWT_EXPIRES_IN` | `1d` | |
| `CORS_ORIGIN` | `*` | comma-separated allowlist; `*` means loopback only |
| `LOG_LEVEL` | `info` | `debug`\|`info`\|`warn`\|`error` |
| `RECOMMENDATION_DEFAULT_TOP_N` | `20` | capped at 100 |
| `RATE_LIMIT_MAX_REQUESTS` | `100` | per minute, `/profile` |
| `RATE_LIMIT_RECOMMENDATIONS_MAX` | `30` | per minute — each request runs an aggregation |
| `HF_DATASET_URL` / `HF_DATASET_NAME` | HF defaults | seed only |
| `SEED_REQUEST_INTERVAL_MS` | `900` | seed pacing |

---

## API

All routes under `/api/v1`. Auth is a JWT, sent as `Authorization: Bearer
<token>` or a `token` cookie (set on login, httpOnly).

| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/user/register` · `/user/login` | auth — public |
| GET | `/user/profile` | current user |
| GET | `/user/logout` | blacklist the token — **GET, not POST** |
| POST | `/profile/extract` | resume text → saved profile + confidence |
| PATCH | `/profile` | correct individual profile fields |
| POST | `/recommendations` | ranked leads (`{ topN }`) |
| GET | `/recommendations/:leadId` | one lead, same scoring |

Response envelope: `{ data, success: true }` or `{ message, success: false }`.

---

## Architecture

```text
┌────────────────────────┐         ┌──────────────────────────┐
│  frontend/  (Netlify)  │  HTTP   │  backend/    (Render)    │
│                        │ ──────► │                          │
│  Next.js App Router    │  :5000  │  Express + Inversify    │
│  Server Components     │         │  Mongoose               │
│  Client islands        │         │                          │
└────────────────────────┘         └────────────┬─────────────┘
                                                  │
                                           ┌──────▼─────┐
                                           │  MongoDB   │
                                           │  users     │
                                           │  jobleads  │
                                           └────────────┘
```

**Backend layering** — controllers are thin (validate, delegate, shape) and are
the routers themselves via `inversify-express-utils`. Every business rule lives
in a service, every query in a repository, and the DI container is the only
composition root.

**Frontend layering** — every `page.js` is a Server Component that fetches its
own data. Interactive pieces are Client Components pushed as far down the tree
as possible, so a page ships only the JS its interactions actually need.

**Auth** is enforced twice: a Next.js proxy redirects before HTML is sent, and
the backend verifies the token on every request. The proxy's cookie check is a
routing convenience, not access control — it never verifies the signature.

---

## Notable decisions

**Scoring lives in Mongo, not Node.** The aggregation does the filtering,
scoring, sorting and truncation, so at 33k leads only `topN` documents ever
cross the wire.

**The extractor is deterministic, and that was a decision.** An LLM-backed
extractor was built and then removed. A free-tier chat model timed out at 30
seconds on a 4,877-character resume; the regex extractor runs in single-digit
milliseconds. The quality argument settled it: on a sales resume the LLM returned
one wrong title and no correct ones, which filtered that user to an empty lead
list.

The honest cost of the deterministic version is its vocabulary — a role family
missing from `extraction.dictionary.ts` extracts no title, and the title hard
filter then matches nothing. That is a real ceiling, and it is why the dictionary
carries the general US job families this dataset actually contains rather than
only software roles.

Every field carries a confidence score derived from evidence, and `PATCH /profile`
lets the user correct any of them. That is the mitigation for a parser being
wrong: the ranking reads what is stored, so a bad extraction costs one edit.

**One profile, no confirmation step — but it is editable.** Storing an extracted
copy and a confirmed copy means two documents that can disagree about the same
user, and a gate that has to be maintained to stay in sync with the ranking. The
cost of that choice is that a user cannot hand-correct a bad extraction as part
of a flow; the compensation is per-field confidence plus `PATCH /profile`, so a
wrong field costs one edit rather than a repaste.

---

## Future scope

- **Server-side pagination** — `topN` (max 100) is the only bound, so the
  frontend pages client-side today.
- **Response caching** — `RECOMMENDATION_CACHE_TTL_SECONDS` is reserved.
- **Semantic retrieval** — the ranking is lexical today, so a profile reading
  "cloud infrastructure" will not reach an SRE posting without a shared token.
  Local embeddings over Atlas Vector Search would close that gap; scoped after
  the pipeline verification that currently guards the ranking is in place.