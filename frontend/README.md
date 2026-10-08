# Frontend — LeadMatch

Next.js 16 App Router UI. Paste a resume, see what was extracted from it, and
get ranked job leads with a full score breakdown.

Part of the [LeadMatch](../README.md) project. Talks to the API over HTTP.

---

## Setup

```bash
npm install
cp .example.env.local .env.local   # NEXT_PUBLIC_API_URL=http://localhost:5000
npm run dev                        # http://localhost:3000
```

```bash
npm run lint
npm run build
npm start
```

The API must be running. See the root README for the full two-terminal setup, or
`docker compose up -d` for a clean local stack.

---

## Pages

| Path | Auth | Fetches |
| --- | --- | --- |
| `/` | no | redirect to `/login` or `/leads` |
| `/login` · `/register` | no | auth endpoints |
| `/profile` | yes | `GET /user/profile`, `POST /profile/extract`, `PATCH /profile` |
| `/leads` | yes | `POST /recommendations` |
| `/leads/[id]` | yes | `GET /recommendations/:leadId` |

Every page is a Server Component. Interactive pieces are Client Components
pushed as far down the tree as the interaction allows.

`/profile` is one screen, not a wizard. Extraction stores what it found and
returns it, so there is nothing to confirm — the page is a paste box above a
read-only view of the current profile with the weakest fields flagged.

**Every field in that view has a pencil icon** and can be corrected in place.
Each save PATCHes only the field it edited, and the value shown afterwards is
the one the server returned rather than the local guess. Repasting a resume
replaces the whole profile, edits included — the new resume is the source of
truth, and merging would leave hand-corrected values pointing at text the user
no longer supplied.

Password fields on both auth forms have a show/hide toggle.

---

## Layout

```text
app/
  layout.js              root — theme, tooltips, toaster
  page.js                landing redirect
  error.js / not-found.js
  (auth)/                login, register
  (app)/                 protected shell + profile, leads, leads/[id]
components/
  ui/                    shadcn primitives — generated, don't edit
  auth/                  LoginForm, RegisterForm
  profile/               ResumePasteForm, ProfileFields (per-field editing)
  leads/                 LeadList, LeadTable, LeadDetail, score breakdown
  layout/                Navbar, ThemeProvider
lib/
  api.js                 axios instance + every API call (client)
  serverApi.js           fetch-based calls for Server Components
  serverAuth.js          cookie reading — server-only
  auth.js                client auth helpers
  constants.js           routes, tiers, score dimensions, limits
hooks/                   useAuth, useToast
proxy.js                 Next 16 middleware — protects /leads and /profile
```

---

## The leads view

One table, ranked. Not a grid of cards, because the task here is comparison:
aligned columns are what make it possible to scan the match column or the salary
column without holding the previous lead in memory. Twenty fit on a screen
instead of three.

Each row carries the job title (a real link to the posting), location, salary,
match percentage, apply rate, tier and the single strongest reason it matched. A
row's title opens the posting in a new tab — the actionable outcome of reading a
lead is applying to it — and the detail page holds the full description and the
six-bar score breakdown.

The backend has no pagination, so the page fetches `topN` once (max 100) and
pages client-side at 20 per page, with the page number in the URL. Pagination
controls render only when there is more than one page.

---

## Theme

Every colour is defined in `app/globals.css` and referenced semantically.
Changing the brand is one line:

```css
--primary: oklch(0.205 0 0);
```

Rank semantics have their own tokens, mirrored in dark mode:

```css
--tier-a: oklch(0.70 0.15 152);   /* green — top match */
--tier-b: oklch(0.75 0.15 80);    /* amber — good match */
--tier-c: oklch(0.68 0.02 260);   /* grey  — possible */
```

A literal `bg-blue-500` anywhere is a bug. Dark mode follows the OS preference
and persists your choice.

**Chips and page text need different foregrounds.** `--tier-*-fg` is for text
*sitting on a filled chip*; `--score-*-text` is for a score *sitting on the
background*. They are separate tokens because the requirements are opposite — a
chip foreground must contrast with a saturated fill, a score must contrast with
the page — and sharing one put near-black text on a near-black background in dark
mode. `contrast-check.mjs` asserts every pairing against WCAG AA (4.5:1) by
reading the built stylesheet, and fails if a chip foreground appears anywhere
outside `TIERS` in `lib/constants.js`:

```bash
npm run build && node contrast-check.mjs
```

```bash
npx shadcn@latest add <component>
```

---

## Notes

**Next 16 differences.** `cookies()` is async, `params` and `searchParams` are
Promises, and `middleware.js` is now `proxy.js`.

**`cacheComponents` is off** (create-next-app enables it). Every route is
auth-gated, and under Cache Components each `cookies()` read must sit inside a
`Suspense` boundary or the build refuses to prerender. With it off, `cookies()`
plus a `cache: "no-store"` fetch give per-request rendering — which is what a
user-specific ranking needs.

**Server and client API modules are separate.** `lib/serverApi.js` and
`lib/serverAuth.js` import `next/headers` and `server-only`, which cannot be
pulled into the client bundle; `lib/api.js` uses axios and `localStorage`, which
do not exist on the server. Mixing them fails the build.

**The API is on a different origin** — Render in production. `CORS_ORIGIN` on
the backend must list this app's URL, or the browser blocks every request. Note
that `CORS_ORIGIN=*` means *loopback only*, not "any origin": the API sets an
httpOnly cookie, and browsers reject `Access-Control-Allow-Origin: *` on a
credentialed request.