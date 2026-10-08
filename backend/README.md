# Backend — Express API for LeadMatch

Recommendation engine for job leads. A user pastes their resume, the backend
extracts a structured profile from it, and that profile is matched against 33k
seeded leads by hard filters plus weighted scoring. Every returned lead carries
the numbers that put it where it did.

- **Stack:** Node.js, Express 4, TypeScript, Inversify, Mongoose 9, Joi
- **Hosting:** Render — a `Dockerfile` is included; see the root README
- **Frontend:** Next.js on Netlify — see [`../frontend`](../frontend)

---

## Quick start

```bash
npm install
cp .example.env .env          # fill in MONGO_URI and JWT_SECRET
npm run seed -- --limit=3000   # ~30s; full 33k takes ~5 min
npm run dev                    # http://localhost:5000
npm run typecheck              # tsc --noEmit
```

---

## The profile

One embedded `profile` on the user document — titles, skills, locations, years
of experience, education level, and a confidence score per field.

`POST /profile/extract` runs the extractor, **persists what it found**, and
returns it. There is no second copy and no confirmation step: two copies of the
same user's profile can disagree, and a gate that has to be kept in sync with
the ranking is a gate that will eventually not be.

The compensation is visibility and correction. Extraction returns a confidence
per field, the profile page flags the weak ones, and `PATCH /profile` lets the
user fix any field in place. A wrong field costs one edit rather than a repaste.

---

## Scoring

Two stages, and the split matters.

**Hard filters** decide *eligibility* — a profile ten years deep should not be
shown an internship at 40k and asked to rate it. Every filter is derived from
the profile: titles become target titles, the literal token `remote` in
locations becomes a remote-only filter, and years of experience imply a
seniority band with a salary floor.

**Weighted scoring** decides *preference* among what survives, across six
dimensions, each 0–1:

| Dimension | 1.0 when | Otherwise |
| --- | --- | --- |
| Title match | exact match on a profile title | 0.7 partial, else 0.2 |
| Skill overlap | — | fraction of profile skills in the posting |
| Salary fit | midpoint above the seniority floor | 0.4 |
| Location fit | remote | 0.9 preferred location, else 0.3 |
| Experience fit | lead's level matches or exceeds the band | 0.5 |
| Lead quality | — | `applies / views`, capped at 1; 0.5 with no views |

`finalScore` is their weighted mean under the shipped `DEFAULT_WEIGHTS`, which
sum to 1.0. Tiers: **A** ≥ 0.8, **B** ≥ 0.6, else **C**.

Every lead returns `scoreBreakdown`, `whyMatched` (human-readable reasons), and
`tier`. A ranking nobody can interrogate is one nobody trusts.

Each hard filter is conditional. A profile with no titles omits the title
clause rather than emitting `$in: []`, which matches nothing in Mongo and would
return zero results with no explanation.

---

## API

All routes are under `/api/v1` and require a JWT, sent as `Authorization:
Bearer <token>` or a `token` cookie.

| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/user/register` · `/user/login` | auth (public) |
| GET | `/user/profile` | current user |
| GET | `/user/logout` | blacklist the token — **GET, not POST** |
| POST | `/profile/extract` | resume text → saved profile + confidence |
| PATCH | `/profile` | correct individual profile fields |
| POST | `/recommendations` | ranked leads (`{ topN }`) |
| GET | `/recommendations/:leadId` | one lead, same scoring |

Response envelope: `{ data, success: true }` or `{ message, success: false }`.

`GET /recommendations/:leadId` returns 404 both for a lead that does not exist
and for one that does not match this user — indistinguishable by design, so a
lead the user would never have been shown cannot be found by guessing ids.

---

## Correcting the profile

`PATCH /api/v1/profile` takes any subset of `titles`, `skills`, `locations`,
`yearsOfExperience`, `educationLevel`. It applies a partial `$set`, so an omitted
key leaves the stored value alone — correcting one skill cannot erase the
locations. `PUT` would have meant the opposite: a body that omitted a field
would read as "clear it".

```bash
curl -X PATCH localhost:5000/api/v1/profile \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"titles":["Site Reliability Engineer"]}'
```

Two rules are worth knowing:

**The client cannot write `confidence`.** It is the backend's own account of what
the parser found, so a client that could set it could mark a bad extraction as
authoritative. `unknown(false)` rejects it. When a user corrects a field the
service promotes that field's confidence to `high` — the extractor is no longer
unsure about a value the user has asserted, and leaving the flag on `low` would
keep showing "please check this" next to something already checked. After that,
`low` means "the machine is unsure and nobody has corrected it".

**`summary` is not editable.** It is the extractor's reading of the resume and
feeds nothing in the ranking.

---

## Seeding

```bash
npm run seed -- --limit=5000     # a working set
npm run seed --                  # all ~33,000 rows, ~5 minutes
npm run seed -- --offset=10000   # resume a partial run
```

Idempotent — every row is an `updateOne({ jobId }, { upsert: true })`, so
re-running updates in place rather than duplicating.

**Rate limiting:** the Hugging Face datasets-server throttles by request volume.
Paging back-to-back trips it within the first few thousand rows, which is why
earlier versions stopped at ~3,500. The seed paces requests
(`SEED_REQUEST_INTERVAL_MS`, default 900ms), honours `Retry-After`, and retries
six times with jittered backoff. On persistent failure it prints the exact
`--offset` to resume from rather than dying in a stack trace.

Derived fields computed at seed time — `salaryMidpoint`, `leadQualityScore`,
`normalizedLocation`, and a `skills` token array that makes skill overlap
computable inside an aggregation.

---

## Configuration

All variables are read through `src/config/env.ts`; nothing reads
`process.env` inline. Full list in [`.example.env`](./.example.env).

| Variable | Required | Notes |
| --- | --- | --- |
| `MONGO_URI` | yes | validated at startup, not at first request |
| `JWT_SECRET` | yes | |
| `PORT` | no | 3000 |
| `CORS_ORIGIN` | no | comma-separated allowlist; `*` = loopback only |
| `LOG_LEVEL` | no | `debug`\|`info`\|`warn`\|`error` |
| `RECOMMENDATION_DEFAULT_TOP_N` | no | 20; capped at 100 |
| `RATE_LIMIT_MAX_REQUESTS` | no | 100/min on `/profile` |
| `RATE_LIMIT_RECOMMENDATIONS_MAX` | no | 30/min — each request runs an aggregation |
| `SEED_REQUEST_INTERVAL_MS` | no | 900 |
Extraction needs no configuration: it is deterministic and runs in-process.

### Why there is no LLM

There was an LLM-backed extractor here. It was removed, not disabled, and the
reason is a measurement rather than a preference.

A free-tier chat model (`openrouter/free`) timed out at 30 seconds on a
4,877-character resume — while the deterministic extractor runs in single-digit
milliseconds. Extraction sits directly in front of the user's first real action,
so a provider that is slow *or* down is not an acceptable dependency for it. The
tiebreaker was quality: on a sales resume the LLM path returned one wrong title
(`Engineering Manager`, from a pattern matching "manager" near "software") and no
correct ones, which then filtered that user down to an empty lead list.

The config was deleted rather than left switched off. Dead configuration reads as
a working feature, and the flag that controlled it was itself never read.

The extractor's cost is its vocabulary: a role family missing from
`constants/extraction.dictionary.ts` extracts no title, and the title hard filter
then matches nothing. When the dataset's common titles are uncovered, add them.

---

## Layout

```text
src/
├── config/       container, typed env, database, CORS policy
├── constants/    status codes, enums, scoring thresholds, dictionaries
├── controllers/  thin HTTP handlers (inversify-express-utils routes)
├── middlewares/  auth, request context, rate limiting
├── models/       User, JobLead, BlacklistToken
├── repositories/ all database access
├── services/     extraction, recommendation, auth
├── types/        interfaces and DTOs
├── utils/        pipeline builder, enrichment, matching primitives
└── validators/   Joi schemas
```

Controllers are thin: validate, delegate, shape. Every business rule lives in a
service, every query in a repository.