# Caprae Capital — Handbook Submission

**Role:** Full Stack Developer
**Name:** Aliasgar
**Submitted:** 11/10/2026

Repo: `https://github.com/1129Aliasgar/caprae_lead_genration_assigniment`
LinkedIn: https://www.linkedin.com/in/aliasgar-bootwala-22b4a8308
Live demo: 

---

## 1. What I built

**LeadMatch** — a scoring and triage layer that sits on top of a lead dataset.

I want to be precise about the framing, because it was the first decision I
made. The handbook asks for an improvement to a lead-generation tool, and the
reference application (SaaSquatch) is a *sourcing* tool: it solves "how do I
find and collect leads". That problem is already solved. Sourcing more leads
makes a weak operation *worse*, not better — a team drowning in 400 raw leads a
week is not short of data, they are short of judgement about where to spend
their Tuesday.

So I did not build another source. I built the step immediately downstream of
sourcing: given a pile of leads, **which ones are worth a human's time?** The
dataset I used has 33,246 real job leads from LinkedIn. My tool reduces that to
a ranked, explained shortlist.

### The three features I chose

**1. Weighted multi-dimensional scoring, executed in the database.**
Every lead is scored on six dimensions — title match, skill overlap, salary
fit, location fit, experience fit and engagement quality — and
`finalScore` is their weighted mean. Scoring runs as a MongoDB aggregation
pipeline, so filtering, scoring, sorting and truncation all happen server-side:
at 33k leads only the top *N* documents ever cross the network. The weights are
shipped and fixed rather than user-adjustable; §4 explains why.

**2. Hard filters separated from ranking.** These are different questions and
conflating them produces bad recommendations. Someone ten years into a career
should not be shown an internship posting at $40k and asked to rate it — that
lead is *ineligible*, not a low match. Filters remove; scores rank what
survives.

**3. Fully explainable output.** Every lead returns the six component scores, a
human-readable reason list (`"83% skill overlap"`, `"Salary within your
range"`), and an A/B/C tier. A ranking nobody can interrogate is one nobody
trusts — and a salesperson who cannot see *why* a lead scored 82% will not
defend that number in a pipeline review.

### The decision I'd argue about hardest: one editable profile, no confirmation gate

Extraction reads the resume and produces a **confidence score per field**. I
built this with an explicit confirmation step first — a staged `extractedProfile`,
a review screen, and a gate that refused to rank until a human confirmed. I
removed it.

The reason is that two copies of the same person's profile is one more thing
that can be wrong, and it is the thing most likely to be *subtly* wrong: a user
confirms what the UI showed them while the pipeline reads what the extractor
wrote, and a mapping mistake between the two produces a ranking that is wrong
in a way neither the user nor the developer can see. The gate also cost three
screens and a status enum to express a distinction the product does not
otherwise make.

What replaced it is per-field editing. Each field carries its confidence, the
profile page flags the weak ones, and `PATCH /api/v1/profile` lets the user
correct any single field in place. I considered whether that is really as good
as the gate and it is not quite: a user can fix one field but cannot add a
skill the parser missed without going through the resume. But it is one edit
instead of three screens, and it keeps a single source of truth.

The part I was most careful about was what happens to the confidence flag when
someone edits a field. The client is not allowed to set it — that is the
backend's own account of what the parser found, and a client that could write it
could mark a bad extraction as authoritative. Instead the service promotes a
corrected field to `high`, because leaving the flag on `low` would keep showing
"please check this" next to a field the user has just checked. After that, `low`
means one thing only: the machine is unsure and nobody has corrected it.

I am aware the version I threw away looked better in a demo.

---

## 2. Business understanding

### What is Caprae's mission?

Caprae is a founder/operator investment firm, and its mission is to make
acquired businesses *good* rather than merely *bought*. That distinction is
stated plainly in the handbook — M&A is framed as "a seven-year journey as the
greater value creation is post-acquisition not at the time of acquisition" —
and it is the whole thesis. Most PE firms are financial engineers: they find
deals, structure them, and exit. Caprae is buying businesses and then
operating them into something better. Value is created after the transaction,
which means the operating partner's job is not to preserve the asset but to
transform it.

That is why an *AI-readiness* challenge is the pre-screening. If the portfolio
company's real problem is operational — decisions made on stale data, process
that depends on whoever happens to be in the room — then the leverage is in
implementation, not financial structure. Helping a business embrace AI to
unlock growth is not a side offering; it is the mechanism by which the
seven-year plan gets executed. The SaaS and MaaS models exist to make that
operational capability transferable and repeatable across the portfolio rather
than rebuilt for every acquisition.

The second thread is "finding the talent." The handbook says the firm looks for
"character, courage, creativity" and is explicit that pedigree and prior
experience are not the filter — "horsepower vs mileage." A firm that intends to
operate rather than hold needs people who can make decisions without a
playbook, because there is no playbook for turning a static business into a
growing one.

### Why do you want to work at Caprae Capital?

Three reasons, and the third is the real one.

*First*, the thesis is the reason I would want to work here. I have not been
attracted to firms that treat acquisitions as financial instruments. The claim
that value is created post-close, and that the operator's job is to build
something better than what was bought, is a claim I find both credible and
interesting. It also means the work is operating work — real problems in real
businesses, not a model that has to reconcile in three years.

*Second*, the pre-screening itself. This was a genuine test rather than a
formality. The handbook says most candidates do not finish, and it shows: the
scope is broad and the timebox is tight. What I enjoy is that the exercise
mirrored the actual work. I was asked to look at a real tool, work out what it
does and why it exists, then decide what the next increment should be and
defend that reasoning. That is the same loop as "here is a portfolio company
with this problem, what do you actually do about it."

*Third*, and this is what I would emphasise in a conversation: I care more about
whether something should use AI than about whether it can.

I built an LLM-backed resume extractor for this project and removed it. The free
tier I was using timed out at 30 seconds on a 4,877-character resume, and on a
sales resume it returned one wrong title — it read "manager" near "software" and
concluded "Engineering Manager" — which then filtered that user down to an empty
lead list. The deterministic extractor I replaced it with runs in single-digit
milliseconds and returned the correct titles. Extraction sits in front of the
user's first real action, so a provider that is slow *or* down is not an
acceptable dependency there, and I would rather my most-used path be the one
nothing can take down.

I deleted the configuration rather than leaving a flag to turn it off. Dead
configuration reads as a feature that works when it does not, and the flag
controlling it was itself never read.

I also removed the feature I thought would be my strongest argument. The first
version gated all ranking behind a human confirming an extracted profile. It was
more impressive to demo and worse to operate, and I explain why in the first
section.

### How is Caprae changing the ETA space and broader PE?

Two ways, and they are related.

The first is what I suspect is the more underrated one: **standardising the
post-acquisition operating playbook.** The handbook's SaaS and MaaS framing is
an attempt to make operational capability a product — something you can deploy
into a business, not something you improvise per deal. If it works, the
seven-year value-creation thesis stops depending on finding exceptional
operators for every single acquisition, and starts being an institutional
capability. That is a structural change to how the model scales, not a
refinement of it.

The second is AI-readiness as a portfolio-wide function. Most PE diligence asks
"is this business profitable and can we predict its cash flow". Caprae's question
appears to be "can this business adopt AI and grow faster because of it" — which
is a different diligence question, because it is about trajectory and operating
capacity rather than a trailing multiple. If it becomes standard practice, the
assets in PE portfolios get a systematic capability upgrade they would not
otherwise have paid for, and the buyers of those assets in five or ten years
inherit AI-enabled businesses as the baseline rather than the exception.

The broader shift is that this makes the operator's job less about financial
engineering and more about technological and organisational change. The
separation between "the people who buy" and "the people who run" has been a
structural weakness of PE for decades, and tooling that lets one group do more
of the other's work is a real attempt to close it.

---

## 3. Short-form answers

**Current working status in the US**
[Your answer — e.g. "Based in [city], on an H-1B visa, authorized to work
until [date]. No sponsorship required." Be accurate and specific; they will
verify.]

**Willing and able to work 40+ hours/week?**
Yes. I currently work [X] hours/week and have no competing commitments.

**Why Caprae Capital?**
Covered in §2 — the post-acquisition thesis, the fact that the pre-screening
was a real test rather than a formality, and a preference for building things
that are boring and durable over things that are impressive and fragile.

**Expected salary**
[Your number] — [brief justification: scope, and where that sits relative to
market for this role].

**Employment terms — please confirm:**

| Term | Confirm |
| --- | --- |
| 3-month probationary period on start | ✅ Confirmed |
| 9AM–6PM EST with a 1-hour lunch break during the initial 2–3 month training program | ✅ Confirmed |
| Available during off hours for customer-service emergencies and time-sensitive projects (fewer than ~2 hrs/week) | ✅ Confirmed — this is not an issue for me |

I have read and understand all three. After training, I am happy to work hours
based on my local time zone.

---

## 4. What I'd build next

Ranked, with the reasoning.

**1. Get a signal on whether the weights are wrong or the matching is wrong.**
Right now both failures look identical from the outside — a ranking that does
not feel useful — and I have no way to tell them apart. The cheapest signal is
a single "was this useful?" on the lead detail page writing to a
`recommendationfeedbacks` collection, with nothing reading it yet. Ten users'
worth of it would tell me whether the 0.3 on title match is wrong or whether my
extraction is; I currently cannot distinguish those, which means every future
tuning decision is a guess. This is worth building *after* I know it is worth
building, unlike everything else on this list.

**2. Server-side pagination.** `topN` is capped at 100 and the frontend pages
client-side. That is fine at 33k leads and wrong at 300k, and it is the change
that would have to land before this is pointed at a larger dataset.

**3. Company resolution.** The dataset has a numeric `company_id` and no company
name, which is a real limitation of the current build — the table shows
`#553718` where it should show a company. Resolving those would enable a much
more useful feature: flagging leads at companies where someone already has a
relationship. That is a sales-workflow feature, not a data feature.

**4. Dedup and freshness.** Lead datasets go stale fast. The seed is idempotent
on `job_id`, but nothing detects that a posting has closed. A lead list that
quietly contains 15% dead postings damages trust in the whole system faster than
any ranking improvement helps.

**5. Grow the extractor's vocabulary from the data.** The dictionary is the
extractor's ceiling: a role family it does not list extracts no title, and the
title hard filter then matches nothing. The next version should be driven by
frequency counts of unrecognised titles across the dataset rather than by
remembering families I happened to think of — I have already appended sales,
healthcare and education roles by hand because a test resume exposed each gap in
turn, which is the wrong way to discover a vocabulary.

---

## 5. Technical summary

| | |
| --- | --- |
| **Backend** | Node.js, Express 4, TypeScript (strict), Inversify 6, Mongoose 9, Joi |
| **Frontend** | Next.js 16 App Router, React 19, JavaScript, Tailwind v4, shadcn/ui |
| **Database** | MongoDB — `users`, `jobleads`, `blacklisttokens` |
| **Ingestion** | Hugging Face Datasets Server, paced and retrying with `Retry-After` |
| **Ranking** | MongoDB aggregation pipeline — `$match` → `$addFields` ×6 → `$sort` → `$limit` → `$project` |
| **Hosting** | Frontend Netlify, API Render |
| **Auth** | JWT — `Authorization` header, httpOnly cookie, `bcrypt` at 10 rounds |
| **Verification** | GitHub Actions: typecheck, lint, build, plus a seeded `verify:pipeline` run against a live MongoDB |
| **Extraction** | Deterministic — regex plus a curated vocabulary, in-process |

### Engineering decisions worth flagging

**Scoring runs in Mongo, not Node.** At 33k leads, filtering and sorting in
application code means transferring the collection. The aggregation returns only
`topN`.

**Hard filters and scoring are deliberately separate.** A constraint that
removes leads and a preference that ranks them are different things, and mixing
them is how you end up showing a user things their profile ruled out.

**Scores are built in `$project`, not derived afterwards.** The numbers shown
to the user are literally the numbers the database sorted on. A breakdown that
disagreed with the ranking would be worse than no breakdown.

**Every hard filter is conditional.** A profile with no titles omits the title
clause rather than emitting `$in: []`, which matches nothing in Mongo and would
return zero results with no explanation. An empty clause is not "no filter" — it
is "no leads".

**The pipeline reads one profile, and every field of it is editable.** There is no
gate between extraction and ranking, so there is no state in which two documents
could disagree. The profile page shows what was extracted and how confident the
extractor was, and a `PATCH` per field lets the user correct anything the parser
got wrong without repasting. The client cannot write the confidence flag; the
service promotes a corrected field to `high` itself, so `low` keeps meaning one
thing — "the machine is unsure and nobody has corrected it".

**Errors are normalised at the API boundary.** The backend returns its own
message, the frontend surfaces that rather than "Request failed with status
code 400". Telling a user *what to do next* is most of the value in an error.

**Five bugs found by running the real pipeline against real data**, none of
which type checking or linting could catch:

- *`finalScore` was 0.000 for every lead.* Weight keys (`titleMatch`) and
  scoring field names (`titleScore`) did not match, so every contribution
  resolved to null and became 0. It type-checked perfectly and produced a
  plausible-looking ordering that was in fact an arbitrary tiebreak.
- *The title filter matched nothing at all.* Inside `$match`, `$in: ["engineer"]`
  is an exact string equality test, not a pattern. Passing a regex source string
  silently excluded every lead.
- *Registration failed for every new user.* Mongoose materialises a nested
  object when its sibling paths have defaults, so a `required` field inside it
  made user creation itself invalid.
- *Logout did not revoke anything.* The auth middleware verified the JWT
  signature but never consulted the blacklist, so a logged-out token kept
  working until it expired — up to a day. Separately, logout read only the
  cookie while auth accepted the `Authorization` header, so for any client
  using a Bearer token it blacklisted `undefined` and returned 200.
- *A resume listing "New York" matched nothing.* Location matching was anchored
  to the whole string, so it never matched the stored `new york, ny`, and the
  hard filter returned zero leads while the profile looked correctly populated.

All five were invisible to type checking and linting, which is the argument for
the one thing I added afterwards: `npm run verify:pipeline`, which seeds a small
lead set, drives the API end to end, and asserts on the *numbers* — that scores
are non-zero, that they descend, that every lead carries a breakdown, that a
revoked token is refused. It runs in CI against a real MongoDB.

The first assertion is the one that matters. A regression that zeroes every
`finalScore` still returns a complete, correctly-shaped, plausibly-ordered list,
so it passes a smoke test and fails only in front of a user who reads the
percentages. Asserting that the numbers are not all zero is what turns that from
a silent regression into a red build.

I would still like unit tests around the pipeline builder — five bugs is enough
evidence that the margin is thin. The end-to-end check covers the class that
actually bit me, not the class that might.
