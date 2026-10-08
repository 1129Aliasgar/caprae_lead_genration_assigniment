/**
 * API routes, mirroring the backend's actual surface.
 *
 * The backend is versioned under /api/v1 and its auth paths are /api/v1/user,
 * not /api/auth. These strings are the single place the frontend knows any of
 * that — no component builds a URL by hand.
 *
 * Note the logout method: the backend exposes it as GET, not POST.
 */

export const API_ROUTES = {
  auth: {
    register: "/api/v1/user/register",
    login: "/api/v1/user/login",
    profile: "/api/v1/user/profile",
    logout: "/api/v1/user/logout",
  },
  profile: {
    extract: "/api/v1/profile/extract",
    update: "/api/v1/profile",
  },
  recommendations: {
    list: "/api/v1/recommendations",
    detail: (id) => `/api/v1/recommendations/${id}`,
  },
};

/** In-app routes. */
export const APP_ROUTES = {
  login: "/login",
  register: "/register",
  profile: "/profile",
  leads: "/leads",
  leadDetail: (id) => `/leads/${id}`,
};

/**
 * localStorage key holding the JWT.
 *
 * The backend also sets an httpOnly cookie, which the proxy reads. This is a
 * deliberate second copy: httpOnly is unreadable from client JS, and the axios
 * request interceptor runs there. Ports do not affect SameSite, so
 * localhost:3000 and localhost:5000 are same-site and the cookie is sent too —
 * but relying on the header alone means auth works even if the cookie is
 * blocked.
 */
export const TOKEN_STORAGE_KEY = "leadmatch.token";

/**
 * The six scoring dimensions, in the order they appear in the backend's
 * `scoreBreakdown`.
 */
export const SCORE_DIMENSIONS = [
  { key: "titleMatch", label: "Title match" },
  { key: "skillMatch", label: "Skill overlap" },
  { key: "salaryFit", label: "Salary fit" },
  { key: "locationFit", label: "Location fit" },
  { key: "experienceFit", label: "Experience fit" },
  { key: "leadQuality", label: "Lead quality" },
];

export const SCORE_DIMENSION_LABELS = {
  titleMatch: "Title match",
  skillMatch: "Skill overlap",
  salaryFit: "Salary fit",
  locationFit: "Location fit",
  experienceFit: "Experience fit",
  leadQuality: "Lead quality",
};

/**
 * Tier buckets. The backend computes them: A ≥ 0.8, B ≥ 0.6, else C.
 *
 * `className` is a *fill* plus the foreground that sits on it, so the pair has
 * to be read together — swapping `--tier-a-fg` for a page-foreground token here
 * is what made these chips unreadable in the first place.
 *
 * Colours are semantic tokens defined in `app/globals.css`, never literal
 * Tailwind palette classes. Measured contrast of each pair against WCAG AA for
 * body text (4.5:1): light A 4.67, B 4.95, C 4.60; dark A 4.76, B 5.65, C 4.77.
 */
export const TIERS = {
  A: {
    label: "Top match",
    description: "Strong across most dimensions",
    className: "bg-tier-a text-tier-a-fg",
    scoreClassName: "bg-tier-a",
  },
  B: {
    label: "Good match",
    description: "Solid on the dimensions that matter",
    className: "bg-tier-b text-tier-b-fg",
    scoreClassName: "bg-tier-b",
  },
  C: {
    label: "Possible match",
    description: "Worth a look, but scored weakly",
    className: "bg-tier-c text-tier-c-fg",
    scoreClassName: "bg-tier-c",
  },
};

/** Tier thresholds, mirrored from the backend so the UI can explain a downgrade. */
export const TIER_THRESHOLDS = { A: 0.8, B: 0.6 };

/**
 * Education levels, mirroring the backend's `EducationLevel` enum verbatim.
 *
 * The values must stay identical to the enum — they go straight into
 * `PATCH /api/v1/profile`, which validates against it, so a hand-written label
 * here would be rejected as an invalid enum member.
 */
export const EDUCATION_LEVELS = [
  { value: "HighSchool", label: "High school" },
  { value: "Associate", label: "Associate" },
  { value: "Bachelors", label: "Bachelor's" },
  { value: "Masters", label: "Master's" },
  { value: "PhD", label: "PhD" },
];

/**
 * How many leads to request from the backend.
 *
 * The backend has no pagination — `topN` is the only bound, capped at 100. So
 * the frontend asks for the maximum once and pages through the result
 * client-side. 100 is the backend's `MAX_TOP_N`; asking for more is a 400.
 */
export const MAX_TOP_N = 100;

/**
 * Most entries allowed in an edited `titles`, `skills` or `locations` list.
 *
 * Mirrors the backend's limit, which is the one that actually rejects. Kept here
 * so the UI can say so in the editor instead of letting someone type 60 entries
 * and meet a 400.
 */
export const MAX_EDITED_LIST_ITEMS = 50;

/**
 * Leads per page in the client-side pager.
 *
 * 20 rather than 10: at this table density 10 leaves a screen of empty space
 * below the fold and reads as truncation when the real answer is "there are
 * more, click through". Pagination renders only when there is more than one
 * page, so a user with 8 matches never sees page controls at all.
 */
export const LEADS_PER_PAGE = 20;

/**
 * Resume length bounds, matching the backend's Joi schema.
 *
 * Checked here so the user gets an inline message rather than a round trip
 * that comes back 400.
 */
export const RESUME_LIMITS = {
  minLength: 40,
  maxLength: 20000,
  approxBytesPerChar: 2,
  /** Body limit is 64kb; 20000 chars of ASCII is roughly 40kb. */
  bodyLimitBytes: 64 * 1024,
};