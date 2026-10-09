# LeadMatch

Paste your resume. Get back ranked job leads that actually match you — and see exactly why each one ranked where it did.

It ranks 33,000 real LinkedIn job postings against your profile using six scoring dimensions, and every lead comes with the numbers that put it there.

| | |
| --- | --- |
| **Backend** | Node.js, Express, TypeScript, MongoDB, Inversify, Joi — `backend/` |
| **Frontend** | Next.js 16, React 19, Tailwind v4, shadcn/ui — `frontend/` |
| **Hosting** | API on Render (Docker), frontend on Netlify, database MongoDB Atlas |
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

## The problem, and who has it

The handbook asks me to improve a lead-generation tool like **SaaSquatch**, which helps companies find and track sales prospects.

The problem I focused on is shared by both versions of that problem, and it is not "find more leads." A company already drowning in leads does not need more data. It needs a way to decide **which ones are worth a human's time this week.**

Today the answer is scrolling. Open the list, scroll through everything, judge each row by eye, and try not to miss the good ones. That fails in two ways: it takes time nobody has, and it depends on judgement that varies with mood and fatigue.

**This tool replaces the scroll with a ranked shortlist.** Build a profile, get the leads that actually fit, in order, with the reason for each one.

### What the business gets

| | |
| --- | --- |
| **Time per user** | One shortlist instead of a long list. The work is reviewing 20 leads, not 500. |
| **No lead gets missed** | Ranking is consistent. It does not depend on who is looking and how tired they are. |
| **Nobody argues with the result** | Every lead shows its own numbers. If someone says "why is this third?", there is an answer. |
| **Recommendations improve as the profile does** | Correct your profile once, and every future list is better. |

### The retention angle

The handbook mentions churn — a user leaving, or planning to leave. Ranking helps there too.

A user who leaves usually stops opening things first. If the same profile engine sends them their five best-matching leads by email every week, the email has a reason to exist, and it is not a generic newsletter.

The trick is that the list gets better. A user's profile sharpens over time, so week eight's email is better than week one's. Someone who deletes the app never sees that, because they already left.

This is the part I would want validated with real churn data before claiming it works. Ranking is proven in the demo; the retention effect is not, because I have no way to run an A/B test on it here.

### A note on the dataset

The dataset I worked with is **job postings**, so what is built and demonstrated is job matching — a person pastes a resume and gets ranked jobs.

The handbook is about B2B sales leads, which is a different domain. I want to be clear about that rather than let it slide: **the engine is the same, the entities are not.** Swap "resume" for "prospect profile" and "job posting" for "sales lead", and the ranking, the filters and the explanation carry over unchanged. That is the part I think transfers; the particular dataset is not the point.

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

**One profile, not two.** An earlier version kept a separate "confirmed" copy and refused to rank until you approved it. Two copies of the same person can disagree, and a gate that has to stay in sync with the ranking is a gate that eventually won't. Editing each field replaced it.

**I built an AI extractor and deleted it.** It worked, but a free model took 30 seconds on a long resume and got a sales resume's title wrong — which then showed that user zero leads. The regex version runs instantly and was more accurate.

---

## Why it's built this way

### Architecture

The backend is in four layers, and each one has one job:

```
controller  →  validate, delegate, shape the response
service     →  all the rules
repository  →  all the database queries
container   →  the only place things get wired together
```

Controllers hold no logic, so there is one place to look for any rule. Queries live only in repositories, so there is one place to look for any query. Dependencies come from one container file, so nothing is created by surprise.

The frontend is the same idea. Pages are Server Components that load their own data, so the browser gets finished HTML instead of a loading spinner. Only the interactive parts are Client Components — the resume form and the profile editor — so a page ships only the JavaScript it actually needs.

### Why the ranking runs inside MongoDB

At 33k leads, filtering in application code means transferring all of them to Node, scoring each one, sorting, and then throwing most away.

Doing it as an aggregation means the database does the work and only `topN` documents ever come back. On a small dataset this would not matter. On a large one it is the difference between a fast page and a timeout.

### Database

MongoDB, three collections: `users`, `jobleads`, `blacklisttokens`.

Chosen over a relational database because the lead data is wide and inconsistent — most postings have a salary, many do not, some list skills and others only have description text. Forcing that into fixed columns means a lot of nulls. Mongo also means the ranking can happen in one pipeline instead of pulling rows out and joining them.

### Caching

**There is no cache.** That is a decision, not an oversight.

A ranking is specific to one user and one moment. Cache it and you show one person another's leads. A cache for these pages would be correct only if the key included the user *and* the profile *and* the version — at which point the hit rate is poor and the cache is mostly complexity.

`RECOMMENDATION_CACHE_TTL_SECONDS` is left in the config for later. It is not wired to anything, and I would rather have an unused setting than a setting that looks like it works.

### Performance

- Only `topN` documents cross the network, not the collection.
- Extraction is regex over one string, not an API call — no network, no rate limit, no cold start.
- The leads page fetches once and pages client-side, because the data is already in memory.
- The heaviest thing in the system is the aggregation, and that is the database's job, not Node's.

### Hosting

| | |
| --- | --- |
| **API** | Render, running a Docker image. Free tier, so it sleeps when idle and cold-starts on the first request. |
| **Frontend** | Netlify, deployed from the repository. Netlify installs, builds and serves. |
| **Database** | MongoDB Atlas, free tier. |

Both deploy by pushing to the repository, so there is no separate deploy step to run.

### Why not vector embeddings?

I looked at this properly and decided against it. The reasons are not the ones I expected.

**It would cost money.** The free embedding options on OpenRouter turned out to be chat models — there is no free embedding tier. Embedding 33k leads works out to roughly **$330** for one run, and it has to be paid again every time the model changes. Extraction was cheap enough to consider a model; embedding 33,000 documents is a different amount.

**It would need a different database.** MongoDB's `$vectorSearch` only works on Atlas, not on a normal local database. So this would mean giving up local development.

**It would make the output harder to explain.** This is the real reason. Cosine similarity gives one number. "0.83" cannot tell a user why. My current scores give six, and each one is a sentence they can argue with — "your Kubernetes experience matches their infrastructure requirement" is something a user can agree or disagree with. A single similarity score cannot be argued with, and a ranking nobody can question is one nobody trusts.

**It would not replace the filters anyway.** Remote-only, salary floor, location — none of that comes from an embedding. I still need hard filters for eligibility, plus a ranking method on top. Vector search adds a second way to rank without removing the first.

**And it would not be faster for the user.** Embedding happens once when the data is seeded, not when someone pastes a resume. My current extraction is milliseconds and needs no network at all.

So the honest summary: **vector search would have made the ranking slightly better and the product noticeably worse.** The explainability loss is not worth a ranking improvement nobody can verify is an improvement.

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
- **No unit tests.** `verify:pipeline` covers the pipeline end to end against a real database, which is where the bugs actually were. Unit tests around the engine are the gap I'd close next.

---

## Handbook questions

Answered in the submission email. Kept here so nothing is lost if the email is not read.

### Caprae's mission

> Caprae buys businesses and then operates them into something better. The handbook frames M&A as "a seven-year journey," with value created after close rather than at close. Most PE firms find deals, structure them and exit. Caprae buys and then transforms.
>
> That is why AI-readiness is the pre-screening rather than a side topic: if the real problem is operational — decisions made on stale data, process that depends on whoever is in the room — the leverage is in implementation, not financial structure. The SaaS and MaaS models exist to make that capability reusable across the portfolio instead of rebuilt for every acquisition.

### Why do you want to work at Caprae?

> Three reasons. The thesis first: value creation is post-close, so the operator's job is not to preserve the asset but to build something better than what was bought. That is operating work on real problems, not a model that has to reconcile in three years.
>
> The pre-screening was a real test. The handbook says most candidates do not finish, and it shows. What I enjoyed is that it mirrored the actual job — look at a real tool, work out what it does and why, then decide what the next increment should be and defend it.
>
> And I care more about whether something should use AI than whether it can. I built an LLM-based extractor for this project and removed it on measurement, not preference. I deleted the API key config rather than leaving a dead flag. I would rather my most-used path be the one nothing can take down.

### How is Caprae changing the ETA space and broader private equity?

> Two ways, and they connect.
>
> **Standardising the post-acquisition playbook.** If it works, the seven-year thesis stops depending on finding exceptional operators for every deal and starts being an institutional capability. That is a structural change to how the model scales, not a refinement of it.
>
> **AI-readiness as a portfolio-wide function.** Most PE diligence asks "is this profitable and can we predict cash flow." Caprae appears to ask "can this business adopt AI and grow faster because of it" — a different question, about trajectory rather than a trailing multiple. If it becomes standard practice, the buyers of those assets in five or ten years inherit AI-enabled businesses as the baseline rather than the exception.
>
> It also narrows a structural weakness of PE: the separation between "the people who buy" and "the people who run." Tooling that lets one group do more of the other's work is a real attempt to close that gap.

### Employment details

Fill these in before sending — they are required and must be accurate.

| | |
| --- | --- |
| **Work status in the US** | [Your answer — visa type, authorisation, expiry. They will verify this.] |
| **Available 40+ hours/week** | [Yes/No — and current hours if not 40] |
| **Expected salary** | [Your number — plus scope and where it sits vs market] |
| **3-month probationary period** | ✅ Confirmed |
| **9AM–6PM EST, 1-hour lunch, during the 2–3 month training program** | ✅ Confirmed |
| **Off-hours availability for customer-service emergencies (< ~2 hrs/week)** | ✅ Confirmed — not an issue for me |

I have read and understood all three terms. After training I am happy to work hours based on my local time zone.

### Links

| | |
| --- | --- |
| **Live demo** | https://lead-match.netlify.app/ |
| **Video walkthrough** | https://drive.google.com/file/d/1N1Cxb7RsCM9M5A2BDjFqZx7oxK7CFggS/view?usp=sharing |
| **Repository** | https://github.com/1129Aliasgar/caprae_lead_genration_assigniment |
| **Resume** | https://drive.google.com/file/d/1rUxclF5UDog3FhRLV_08qoi4lB4Jncb9/view?usp=sharing |