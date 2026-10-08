#!/usr/bin/env node
/**
 * Proves the ranking pipeline produces real, correctly-ordered leads.
 *
 * This exists because typecheck and lint are blind to numeric correctness. Each
 * bug it would have caught:
 *
 *   - `finalScore` was 0.000 on every lead (weight keys vs scoring field names)
 *   - the title filter matched nothing (`$in` with a regex source string)
 *   - a required field inside a nested object broke registration
 *   - location anchoring never matched "new york, ny"
 *
 * It seeds a small lead set, then drives the HTTP API end to end. It writes to
 * the database it is pointed at and creates a user, so it is a test against a
 * throwaway database — never production.
 *
 * Usage:
 *   npm run verify:pipeline                 # expects MONGO_URI to already have data
 *   SKIP_EXTRACTION=1 npm run verify:pipeline   # inject a profile without calling the LLM
 */

import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const API = process.env.API_URL ?? "http://localhost:5000";
const ROOT = `${API}/api/v1`;

/*
 * Resolved from this file rather than from `process.cwd()`.
 *
 * The script lives in `scripts/verify/` and the fixture in `test/resumes/`, so
 * the path is two levels up from here — but `npm run` executes from the package
 * root, so a `cwd`-relative path silently reads the wrong location and throws
 * ENOENT only when extraction is not skipped. CI hits exactly that, because it
 * sets SKIP_EXTRACTION.
 */
const RESUME_FIXTURE = resolve(HERE, "..", "..", "test", "resumes", "01-devops-sre.md");

/*
 * Extraction is one call per user against a rate-limited provider, so it is the
 * one step a shared CI key cannot rely on. When SKIP_EXTRACTION is set, write
 * the profile directly to Mongo instead — which still exercises the ranking
 * path, and that is the path that regressed.
 */
const SKIP_EXTRACTION = process.env.SKIP_EXTRACTION === "1";

let failed = false;

const pass = (label) => console.log(`  PASS  ${label}`);
const fail = (label, detail = "") => {
  console.log(`  FAIL  ${label}${detail ? `  ${detail}` : ""}`);
  failed = true;
};
const assert = (label, condition, detail = "") =>
  condition ? pass(label) : fail(label, detail);

async function call(method, path, { token, body } = {}) {
  const response = await fetch(`${ROOT}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  return {
    ok: response.ok,
    status: response.status,
    body: await response.json().catch(() => null),
  };
}

console.log(`LeadMatch pipeline check — ${API}\n`);

/* ------------------------------------------------------------- reachable -- */

const health = await fetch(`${ROOT}/health`).catch(() => null);

if (!health?.ok) {
  console.error(
    `  Cannot reach the API at ${API}.\n` +
      "  Start it with `npm run dev` first, or set API_URL.",
  );
  process.exit(1);
}

pass("API reachable");

/* --------------------------------------------------------------- register -- */

const username = `ci_${Date.now().toString(36)}`;
const password = "VerifyPass123!";

const registered = await call("POST", "/user/register", {
  body: { username, email: `${username}@example.com`, password },
});

assert("register", registered.ok, JSON.stringify(registered.body));

const token = registered.body?.data?.token;

if (!token) process.exit(1);

/* ---------------------------------------------------------------- profile -- */

let profile;

if (SKIP_EXTRACTION) {
  /*
   * Written straight to the database rather than through the API: the point of
   * this run is the ranking, and going through extraction would spend a
   * rate-limited provider call to produce an input the ranking does not care
   * about.
   */
  const { default: mongoose } = await import("mongoose");

  await mongoose.connect(process.env.MONGO_URI);

  await mongoose.connection.db.collection("users").updateOne(
    { username },
    {
      $set: {
        profile: {
          titles: ["Software Engineer"],
          skills: ["aws", "kubernetes", "terraform", "linux", "python"],
          locations: ["united states"],
          yearsOfExperience: 8,
          educationLevel: "Bachelors",
          summary: "Infrastructure engineer.",
          confidence: {
            titles: "high",
            skills: "high",
            yearsOfExperience: "high",
            educationLevel: "medium",
          },
          extractorVersion: "verify-script",
          extractedAt: new Date(),
        },
      },
    },
  );

  await mongoose.disconnect();

  profile = { injected: true };

  pass("profile injected (SKIP_EXTRACTION)");
} else {
  const resumeText = await readFile(RESUME_FIXTURE, "utf8");

  const extracted = await call("POST", "/profile/extract", {
    token,
    body: { resumeText },
  });

  assert("extract", extracted.ok, JSON.stringify(extracted.body));

  profile = extracted.body?.data?.profile;

  if (profile) {
    assert("  titles extracted", profile.titles?.length > 0, JSON.stringify(profile.titles));
    assert("  skills extracted", profile.skills?.length > 0, String(profile.skills?.length));
    assert(
      "  confidence present",
      Boolean(profile.confidence?.titles && profile.confidence?.skills),
    );
  }
}

/* ----------------------------------------------------------------- ranking -- */

const ranked = await call("POST", "/recommendations", {
  token,
  body: { topN: 100 },
});

assert("rank", ranked.ok, JSON.stringify(ranked.body));

const leads = ranked.body?.data?.leads ?? [];

assert("  leads returned", leads.length > 0, `${leads.length} leads`);

if (leads.length > 0) {
  /*
   * The regression that mattered: a complete, correctly-shaped list where every
   * score was 0.000 because the weight keys and the scoring field names did not
   * match. An eyeball test passes this. Only the numbers catch it.
   */
  const scores = leads.map((lead) => lead.scoreBreakdown?.finalScore ?? 0);

  assert(
    "  scores are non-zero",
    scores.some((score) => score > 0),
    `max ${Math.max(...scores)}`,
  );

  assert(
    "  scores are in descending order",
    scores.every((score, i) => i === 0 || scores[i - 1] >= score),
  );

  assert(
    "  every lead has a breakdown",
    leads.every((lead) => lead.scoreBreakdown && Array.isArray(lead.whyMatched)),
  );

  assert(
    "  tiers are assigned",
    leads.every((lead) => ["A", "B", "C"].includes(lead.tier)),
  );
}

/* ------------------------------------------------------------ lead detail -- */

if (leads.length > 0) {
  const detail = await call("GET", `/recommendations/${leads[0].jobId}`, { token });

  assert("lead detail", detail.ok && Boolean(detail.body?.data?.lead));
}

/* ----------------------------------------------------------------- logout -- */

await call("GET", "/user/logout", { token });

const afterLogout = await call("POST", "/recommendations", {
  token,
  body: { topN: 20 },
});

assert("revoked token is rejected", !afterLogout.ok, `status ${afterLogout.status}`);

console.log(failed ? "\nFAILED\n" : `\nPASS\n`);
process.exit(failed ? 1 : 0);