# LeadMatch

Paste your resume. Get back ranked job leads that actually match you — and see exactly why each one ranked where it did.

It ranks 33,000 real LinkedIn job postings against your profile using six scoring dimensions, and every lead comes with the numbers that put it there.

| | |
| --- | --- |
| **Backend** | Node.js, Express, TypeScript, MongoDB, Inversify, Joi — `backend/` |
| **Frontend** | Next.js 16, React 19, Tailwind v4, shadcn/ui — `frontend/` |
| **Data** | [xanderios/linkedin-job-postings](https://huggingface.co/datasets/xanderios/linkedin-job-postings) |
| **LiveDemo** | [LiveDemo](https://lead-match.netlify.app/) |

Repo: `https://github.com/1129Aliasgar/caprae_lead_genration_assigniment`

---

## Run it

```bash
# 1 — API
cd backend
npm install
cp .example.env .env            # add your MONGO_URI and JWT_SECRET
npm run seed:leads -- --limit=2000
npm run dev                     # http://localhost:5000

# 2 — Frontend
cd frontend
npm install
cp .example.env.local .env.local
npm run dev                     # http://localhost:3000
```

Or with Docker: `docker compose up -d`

Then register at `http://localhost:3000/register`, paste a resume on `/profile`, and check `/leads`.

There are three ready-made test resumes in `backend/test/resumes/` if you want one that returns results.

---

## How it works

```
resume → extract profile → rank leads → show why
```

**1. Extract.** Regex plus a curated word list reads your resume into a profile: job titles, skills, locations, years of experience, education. Fast and free — no API, no key.

Every field comes with a confidence score, so you can see what it wasn't sure about.

**2. Rank.** Six dimensions decide the order:

| | |
| --- | --- |
| Title match | how close the job title is to yours |
| Skill overlap | how many of your skills the posting mentions |
| Salary fit | whether it pays what your experience level is worth |
| Location fit | remote, or where you want to be |
| Experience fit | seniority vs yours |
| Lead quality | how many people applied vs viewed |

Hard filters remove leads you are not eligible for. Scoring ranks what's left.

**3. Explain.** Every lead shows `scoreBreakdown` (the six numbers), `whyMatched` (plain-English reasons), and a tier A/B/C. The numbers you see are the numbers the database sorted on — nothing is re-derived for display.

**You can edit anything.** Wrong title, missing skill, wrong years? Fix it on `/profile` and your leads re-rank immediately.

---

## Why it's built this way

**Ranking runs inside MongoDB.** At 33k leads, filtering in application code means shipping the whole collection. The aggregation returns only `topN`.

**One profile, not two.** An earlier version kept a separate "confirmed" copy and refused to rank until you approved it. Two copies of the same person can disagree, and a gate that has to stay in sync with the ranking is a gate that eventually won't. Editing each field replaced it.

**I built an AI extractor and deleted it.** It worked, but a free model took 30 seconds on a long resume and got a sales resume's title wrong — which then showed that user zero leads. The regex version runs instantly and was more accurate. That trade wasn't worth it.

---

## Verify it

```bash
cd backend && npm run typecheck
cd frontend && npm run lint && npm run build

# the important one — runs the real pipeline against a real database
cd backend
npm run dev                    # in another terminal
npm run verify:pipeline
```

That last one checks the scores are non-zero and in the right order. Typecheck and build can't do that — five bugs in this project passed all of them, including one where every score was `0.000` and the list still looked fine.

GitHub Actions runs all of it on every push.

---

## API

All routes under `/api/v1`, need a JWT in `Authorization: Bearer <token>`.

| | |
| --- | --- |
| `POST /user/register` · `/user/login` | auth |
| `GET /user/profile` | your profile |
| `POST /profile/extract` | resume → profile |
| `PATCH /profile` | fix individual fields |
| `POST /recommendations` | ranked leads |
| `GET /recommendations/:id` | one lead, same scoring |

---

## Known limits

- **No company names.** The dataset has a numeric `company_id` and nothing else, so the table shows `Company #553718`.
- **Mixed pay units.** Salaries arrive hourly, weekly, monthly and yearly, and the pay floor compares them without converting. About 900 leads are filtered out that shouldn't be.
- **Limited vocabulary.** A job title the extractor doesn't know produces no match. It covers the common families in this dataset, but it isn't exhaustive.