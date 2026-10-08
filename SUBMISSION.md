# Caprae Capital — Assignment Submission

**Role:** Full Stack Developer
**Name:** Aliasgar
**Submitted:** 9/10/2026

Repo: `https://github.com/1129Aliasgar/caprae_lead_genration_assigniment`
LinkedIn: https://www.linkedin.com/in/aliasgar-bootwala-22b4a8308/
Live demo: [DEMO URL]

---

## 1. What I built

**LeadMatch** — paste your resume, get ranked job leads that match you, and see exactly why each one ranked where it did.

The reference tool (SaaSquatch) is a *sourcing* tool. It solves "how do I find leads." That's solved. Sourcing more leads doesn't help when you already have 400 a week and no way to decide which deserve your time.

So I built the step after that: given a pile of leads, **which ones are worth a human's time?** The dataset has 33,246 real LinkedIn postings. This turns that into a ranked, explained shortlist.

### Three things I'm happy with

**1. Scoring runs inside the database.** Six dimensions decide the order, computed as a MongoDB aggregation. At 33k leads, doing it in application code means shipping the whole collection — this returns only the top *N*.

**2. Filters and ranking are separate.** Someone ten years into a career shouldn't be shown an internship at $40k and asked to rate it. That lead is *ineligible*, not a low match. Filters remove; scores rank what's left.

**3. Every score is explainable.** Each lead returns its six component scores, plain-English reasons, and a tier. The numbers shown are the numbers the database sorted on. A ranking nobody can question is one nobody trusts.

### Two things I removed

**I built an AI resume extractor and deleted it.** It worked, but a free model took 30 seconds on a longer resume, and on a sales resume it returned one wrong job title — which then showed that user *zero leads*. The regex version I replaced it with runs instantly and was more accurate. Extraction sits right in front of the user's first action, so a provider that's slow or down isn't acceptable there. I deleted the API key config too, rather than leaving a flag to turn it off.

**I removed the feature I thought would be my strongest argument.** The first version made users confirm an extracted profile before any ranking would run. It demos better. But two copies of the same person can disagree, and a gate you have to keep in sync with the ranking is a gate that eventually won't be. Editing each field instead does the same job in one screen.

---

## 2. Business understanding

**Caprae's mission.** They buy businesses and then operate them into something better — the handbook frames M&A as "a seven-year journey," with value created after close rather than at close. Most PE firms find deals, structure them, exit. Caprae buys and then transforms. That's why AI-readiness is the pre-screening: if the real problem is operational, the leverage is in implementation, not financial structure. The SaaS and MaaS models exist to make that capability reusable across the portfolio instead of rebuilt per acquisition.

**Finding talent.** The handbook looks for "character, courage, creativity" and says pedigree isn't the filter — "horsepower vs mileage." A firm that intends to operate needs people who can make decisions without a playbook.

### Why Caprae?

**The thesis.** Value creation is post-close, so the operator's job isn't to preserve the asset — it's to build something better than what was bought. That makes it operating work on real problems, not a model that has to reconcile in three years.

**The pre-screening was a real test.** The handbook says most candidates don't finish, and it shows. What I enjoyed is that it mirrored the actual work: look at a real tool, work out what it does and why, then decide what the next increment should be and defend it.

**And I care more about whether something should use AI than whether it can.** I built the LLM extractor and removed it on measurement, not preference. I deleted the config rather than leaving a dead flag. I'd rather my most-used path be the one nothing can take down.

### How is Caprae changing PE?

Two ways, and they connect.

**Standardising the post-acquisition playbook.** If it works, the seven-year thesis stops depending on finding exceptional operators for every deal and becomes an institutional capability. That's structural, not incremental.

**AI-readiness as a portfolio-wide function.** Most diligence asks "is this profitable and can we predict cash flow." Caprae appears to ask "can this adopt AI and grow faster because of it" — a different question, about trajectory rather than a trailing multiple. If that becomes standard, the buyers of those assets in five years inherit AI-enabled businesses as the baseline.

It also narrows the gap between "the people who buy" and "the people who run" — a structural weakness of PE for decades.

---

## 3. Short answers

**Current status in the US**
[Your answer — accurate and specific. They will verify.]

**40+ hours/week?**
Yes. I currently work [X] hours/week with no competing commitments.

**Why Caprae?** Covered above.

**Expected salary**
[Your number] — [scope, and where that sits vs market].

**Employment terms:**

| Term | Confirm |
| --- | --- |
| 3-month probationary period | ✅ |
| 9AM–6PM EST, 1-hour lunch, during the 2–3 month training program | ✅ |
| Off-hours availability for customer-service emergencies (< ~2 hrs/week) | ✅ — not an issue |

I've read and understood all three. After training I'm happy to work hours based on my local time zone.

---

## 4. What I'd build next

**1. Fix the salary comparison.** Pay arrives in hourly, weekly, monthly and yearly units, and the filter compares them without converting. About 900 leads are wrongly excluded — a $63/hr posting (~$131k/yr) fails a $100k floor because 63 < 100000. The fix is to annualise once at seed time.

**2. Get a signal on what's wrong with the ranking.** Right now a bad ranking looks the same whether the weights are wrong or the extraction is. One "was this useful?" button, writing to a collection nothing reads yet, would tell me which. Ten users' worth is enough.

**3. Company resolution.** The dataset has a numeric company ID and no name, so the table shows `Company #553718`. Fixing that also unlocks flagging leads at companies where someone already has a relationship — a sales workflow feature, not a data one.

**4. Server-side pagination.** `topN` is capped at 100 and the frontend pages client-side. Fine at 33k, wrong at 300k.

**5. Grow the extractor's vocabulary from the data.** The word list is the extractor's ceiling. The next version should come from frequency counts of unrecognised titles in the dataset, not from remembering families I happened to think of.

---

## 5. Technical

| | |
| --- | --- |
| **Backend** | Node.js, Express, TypeScript, Inversify, Mongoose, Joi |
| **Frontend** | Next.js 16 App Router, React 19, Tailwind v4, shadcn/ui |
| **Database** | MongoDB — `users`, `jobleads` |
| **Ingestion** | Hugging Face Datasets Server, paced with retries |
| **Ranking** | MongoDB aggregation — `$match` → `$addFields` ×6 → `$sort` → `$limit` |
| **Hosting** | Frontend Netlify, API Render |
| **Auth** | JWT — header + httpOnly cookie, bcrypt |
| **CI** | GitHub Actions — typecheck, lint, build, plus a live pipeline run |

### Decisions worth flagging

**Scoring runs in Mongo, not Node.** At 33k leads, filtering in app code means transferring the collection.

**Filters and scores are deliberately separate.** A constraint that removes leads and a preference that ranks them are different things. Mixing them is how you show users what they ruled out.

**Scores are built in `$project`, not after.** The numbers shown are the numbers the database sorted on. A breakdown that disagreed with the ranking would be worse than no breakdown.

**Errors are normalised at the API.** The backend returns its own message and the frontend shows that, not "Request failed with status code 400." Telling a user what to do next is most of the value in an error.

### Bugs I found by running it

Five bugs in this project passed typecheck *and* lint *and* build:

- Every `finalScore` was `0.000` — the weight keys and the scoring field names didn't match, so everything resolved to zero. It type-checked perfectly and returned a plausible-looking list that was really just an arbitrary tiebreak.
- The title filter matched nothing. Inside `$match`, `$in: ["engineer"]` is exact equality, not a pattern — passing a regex source string silently excluded every lead.
- Registration failed for every new user. Mongoose fills in a nested object when sibling paths have defaults, which made a `required` field inside it invalid.
- Logout didn't revoke anything. Auth checked the token signature but never checked whether it had been blacklisted, so a logged-out token kept working until it expired. It also read only the cookie while auth accepted the header, so any client using a Bearer token "logged out" successfully while doing nothing.
- A resume saying "New York" matched no leads — location matching was anchored to the whole string, so it never matched the stored `new york, ny`.

I added `npm run verify:pipeline` because of these. It seeds, drives the API, and asserts the scores are non-zero and correctly ordered — the one check that catches this class. It runs in CI.

**What I don't have:** unit tests. The end-to-end check covers the bugs that actually bit me, not the ones that might. That's the gap I'd close first.