# Frontend — LeadMatch UI

Next.js 16 App Router. Paste a resume, see what was extracted, fix what's wrong, get your leads.

```bash
npm install
cp .example.env.local .env.local   # NEXT_PUBLIC_API_URL=http://localhost:5000
npm run dev                        # http://localhost:3000
```

The API needs to be running too — see the [root README](../README.md).

## Pages

| | |
| --- | --- |
| `/login` `/register` | auth |
| `/profile` | paste a resume, edit the extracted profile |
| `/leads` | ranked table |
| `/leads/[id]` | one lead with its full score breakdown |

Every page is a Server Component that loads its own data. Interactive bits are Client Components, so a page only ships the JavaScript it actually needs.

## The leads table

One table, not a grid of cards. Comparing leads is the job — job title against salary against score — and aligned columns make that a glance instead of a memory test. Twenty rows per page, with pagination only when there's more than one page.

Each row links straight to the real job posting. Applying is the point; the detail page is for the score breakdown.

## Editing the profile

Every field has a pencil icon. Each save sends only that field, so fixing one skill can't disturb the rest. After saving, it shows what the server stored — not what the form hoped it stored.

Replacing your resume overwrites everything, including your edits. The new resume is the source of truth.

## A few things worth knowing

- **Password fields** have a show/hide toggle on both forms.
- **Colours are defined in `globals.css`** as named tokens. A literal `bg-blue-500` is a bug — it won't work in dark mode. Score colours and badge colours are deliberately separate: text on a page needs to contrast with the page, text on a coloured badge needs to contrast with the badge. They are opposite requirements, and using one for both made the match percentage invisible in dark mode once already.

```bash
npx shadcn@latest add <component>
```

## Notes

**Next 16:** `cookies()` is async, `params` and `searchParams` are Promises, and `middleware.js` is now `proxy.js`.

**Server and client API modules are separate.** `lib/serverApi.js` and `lib/serverAuth.js` use `next/headers`, which can't go in the client bundle. `lib/api.js` uses axios and `localStorage`, which don't exist on the server. Mixing them fails the build.

**The API is on a different origin** in production, so `CORS_ORIGIN` on the backend has to list this app's URL or the browser blocks everything.