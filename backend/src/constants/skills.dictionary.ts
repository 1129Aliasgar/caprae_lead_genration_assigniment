/**
 * @author aliasgarbootwala@gmail.com
 *
 * Curated skill vocabulary, shared by the extractor (find skills in a resume)
 * and the seed (fall back to scanning a description when `skills_desc` is
 * null).
 *
 * Entries are stored lowercase: both call sites lowercase their input before
 * comparing, and keeping one casing avoids a normalisation pass at every
 * comparison site.
 *
 * This is a starting set, not an exhaustive one. Adding an entry here
 * immediately improves extraction and skill-overlap scoring with no code
 * change elsewhere.
 */

const rawDictionary: string[] = [
  // ---- languages ----
  "javascript",
  "typescript",
  "python",
  "java",
  "c++",
  "c#",
  "go",
  "rust",
  "ruby",
  "php",
  "swift",
  "kotlin",
  "scala",
  "elixir",
  "haskell",
  "clojure",
  "lua",
  "perl",
  "r",
  "matlab",
  "dart",
  "objective-c",
  "shell",
  "bash",
  "sql",
  "html",
  "css",
  "sass",
  "graphql",

  // ---- frontend frameworks ----
  "react",
  "react native",
  "next.js",
  "vue",
  "nuxt",
  "angular",
  "svelte",
  "sveltekit",
  "remix",
  "astro",
  "tailwind css",
  "redux",
  "zustand",
  "mobx",
  "jquery",
  "webpack",
  "vite",
  "babel",
  "storybook",

  // ---- backend frameworks ----
  "node.js",
  "express",
  "nestjs",
  "fastify",
  "django",
  "flask",
  "fastapi",
  "rails",
  "spring boot",
  "spring",
  ".net",
  "asp.net",
  "laravel",
  "django rest",
  "django rest framework",
  "grpc",
  "graphql-js",
  "apollo",
  "prisma",
  "sequelize",
  "typeorm",
  "drizzle",
  "mongoose",

  // ---- databases ----
  "mongodb",
  "mysql",
  "postgresql",
  "postgres",
  "sqlite",
  "redis",
  "elasticsearch",
  "cassandra",
  "dynamodb",
  "dynamo db",
  "oracle",
  "sql server",
  "mariadb",
  "neo4j",
  "snowflake",
  "bigquery",
  "redshift",
  "clickhouse",
  "cockroachdb",
  "firebase",
  "firestore",
  "supabase",
  "planetscale",
  "mssql",

  // ---- cloud / infra ----
  "aws",
  "azure",
  "gcp",
  "google cloud",
  "docker",
  "kubernetes",
  "k8s",
  "terraform",
  "ansible",
  "pulumi",
  "cloudformation",
  "heroku",
  "vercel",
  "netlify",
  "cloudflare",
  "digitalocean",
  "lambda",
  "ec2",
  "s3",
  "rds",
  "route53",
  "vpc",
  "iam",
  "openstack",
  "vmware",
  "serverless",
  "cloudfront",

  // ---- devops / sre ----
  "ci/cd",
  "jenkins",
  "circleci",
  "github actions",
  "gitlab ci",
  "travis ci",
  "argocd",
  "helm",
  "prometheus",
  "grafana",
  "datadog",
  "splunk",
  "new relic",
  "nginx",
  "apache kafka",
  "kafka",
  "rabbitmq",
  "pulsar",
  "consul",
  "vault",
  "nginx ingress",
  "linux",
  "unix",
  "load balancing",
  "observability",
  "sre",
  "site reliability engineering",

  // ---- data / ml ----
  "machine learning",
  "deep learning",
  "nlp",
  "natural language processing",
  "computer vision",
  "computer_vision",
  "pytorch",
  "tensorflow",
  "keras",
  "scikit-learn",
  "sklearn",
  "pandas",
  "numpy",
  "scipy",
  "matplotlib",
  "seaborn",
  "spark",
  "pyspark",
  "hadoop",
  "hive",
  "airflow",
  "dbt",
  "mlflow",
  "kubeflow",
  "langchain",
  "opencv",
  "statistics",
  "data engineering",
  "data analysis",
  "data science",
  "etl",
  "analytics",
  "a/b testing",
  "experimentation",
  "forecasting",
  "recommender systems",

  // ---- design ----
  "figma",
  "sketch",
  "adobe xd",
  "adobe creative suite",
  "photoshop",
  "illustrator",
  "prototyping",
  "wireframing",
  "design systems",
  "user research",
  "ux research",
  "interaction design",
  "visual design",
  "usability testing",

  // ---- product / pm ----
  "product management",
  "roadmapping",
  "product strategy",
  "agile",
  "scrum",
  "kanban",
  "stakeholder management",
  "user stories",
  "sprint planning",
  "jira",
  "confluence",
  "prioritization",
  "go-to-market",
  "gtm",
  "business analysis",
  "requirements gathering",

  // ---- qa ----
  "unit testing",
  "integration testing",
  "end-to-end testing",
  "e2e testing",
  "test automation",
  "cypress",
  "playwright",
  "selenium",
  "jest",
  "vitest",
  "mocha",
  "pytest",
  "junit",
  "postman",
  "tdd",
  "bdd",
  "load testing",
  "jmeter",

  // ---- mobile ----
  "android",
  "ios",
  "jetpack compose",
  "xcode",
  "flutter",
  "react native cli",
  "app store",
  "google play",
  "mobile development",

  // ---- practices / architecture ----
  "rest api",
  "rest apis",
  "microservices",
  "monorepo",
  "event driven architecture",
  "system design",
  "distributed systems",
  "domain driven design",
  "ddd",
  "solid principles",
  "design patterns",
  "mvc",
  "messaging queues",
  "caching",
  "performance optimization",
  "scalability",
  "high availability",
  "refactoring",
  "code review",
  "technical documentation",
  "git",
  "github",
  "gitlab",
  "bitbucket",
  "version control",
  "open source",

  // ---- security ----
  "authentication",
  "authorization",
  "oauth",
  "oauth2",
  "jwt",
  "saml",
  "sso",
  "penetration testing",
  "encryption",
  "cryptography",
  "owasp",
  "xss",
  "csrf",
  "firewall",
  "iam policies",
  "rbac",

  // ---- soft skills ----
  "communication",
  "teamwork",
  "leadership",
  "mentoring",
  "collaboration",
  "problem solving",
  "critical thinking",
  "time management",
  "adaptability",
  "presentation skills",
  "public speaking",
  "project management",
  "cross-functional collaboration",
  "stakeholder communication",
  "conflict resolution",
  "decision making",
  "attention to detail",
  "self-starter",
  "ownership",
  "customer facing",
  "documentation",
  "prioritization",

  /*
   * ---- sales, account management, business development ----
   *
   * The lead dataset is general US postings whose most common skills are
   * `communication`, `leadership`, `documentation`, `project management` and
   * `forecasting` — not software tools. Without these entries a sales resume
   * extracted three skills, so every sales lead scored near zero on overlap
   * and the ranking was effectively decided by title alone.
   *
   * Values must match the canonical tokens the seed writes into
   * `JobLead.skills`, since scoring compares the two arrays with
   * `$setIntersection`.
   */
  "sales",
  "account management",
  "business development",
  "b2b saas",
  "negotiation",
  "contract negotiation",
  "forecasting",
  "pipeline management",
  "lead generation",
  "crm",
  "salesforce",
  "hubspot",
  "quota attainment",
  "cold calling",
  "discovery",
  "renewal management",
  "upsell",
  "cross selling",
  "territory management",
  "inside sales",
  "customer service",
  "customer success",
  "account executive",
  "outreach",

  // ---- finance, accounting, analysis ----
  "accounting",
  "financial reporting",
  "financial analysis",
  "budgeting",
  "forecasting models",
  "audit",
  "bookkeeping",
  "payroll",
  "accounts payable",
  "accounts receivable",
  "gaap",
  "quickbooks",
  "sap",
  "net-suite",
  "data analysis",
  "reporting",
  "requirements gathering",
  "business analysis",
  "process improvement",
  "stakeholder interviews",
  "tableau",
  "power bi",
  "excel",
  "postgresql",
  "etl",
];

/**
 * De-duplicated and sorted so the array is stable between runs — the seed
 * iterates it, and a stable order keeps index behaviour predictable.
 */
export const SKILL_DICTIONARY: string[] = [
  ...new Set(rawDictionary.map((skill) => skill.trim().toLowerCase())),
]
  .filter((skill) => skill.length > 0)
  .sort((a, b) => a.localeCompare(b));

/**
 * Alias → canonical spelling. Applied by the extractor so that "ReactJS",
 * "react.js" and "React" all land on `react`, and the confirmed skill list the
 * recommender intersects against stays stable regardless of how the user (or
 * the posting) phrased it.
 */
export const SKILL_ALIASES: Record<string, string> = {
  "reactjs": "react",
  "react.js": "react",
  "react native": "react native",
  "reactnative": "react native",
  "nextjs": "next.js",
  "next js": "next.js",
  nodejs: "node.js",
  node: "node.js",
  "node js": "node.js",
  expressjs: "express",
  vuejs: "vue",
  angularjs: "angular",
  /*
   * Alias targets are the full, recognisable spelling rather than the short
   * form — a user reading their confirmed profile back should see
   * "kubernetes", not "k8s".
   *
   * These targets must also agree with what the seed stores in
   * `JobLead.skills`, because the scoring pipeline compares the two arrays
   * with `$setIntersection`, which is exact-string. `canonicalizeSkill` is
   * what keeps them in step; adding a spelling here without canonicalising it
   * on the seed side silently breaks skill scoring for that skill.
   */
  postgres: "postgresql",
  postgresql: "postgresql",
  mongodb: "mongodb",
  mongo: "mongodb",
  "amazon web services": "aws",
  "google cloud platform": "gcp",
  k8s: "kubernetes",
  kubernetes: "kubernetes",
  "apache kafka": "kafka",
  "ci-cd": "ci/cd",
  cicd: "ci/cd",
  "continuous integration": "ci/cd",
  "machine-learning": "machine learning",
  ml: "machine learning",
  "deep-learning": "deep learning",
  dl: "deep learning",
  ai: "machine learning",
  "scikit learn": "scikit-learn",
  sklearn: "scikit-learn",
  tf: "tensorflow",
  "javascript/typescript": "typescript",
  ts: "typescript",
  js: "javascript",
  py: "python",
  golang: "go",
  "c sharp": "c#",
  "objective c": "objective-c",
  dotnet: ".net",
  "design patterns": "design patterns",
  "pair programming": "collaboration",
  "public speaking": "public speaking",
};

/**
 * Reduce any spelling of a skill to the one canonical form.
 *
 * Applied on both sides of the scoring comparison — the extractor, and the
 * seed when it writes `JobLead.skills` — because `$setIntersection` matches
 * strings exactly. If the extractor emits `kubernetes` and the seed stored
 * `k8s`, every one of that user's Kubernetes-matching leads silently scores
 * zero skill overlap, which is invisible in the response but very visible in
 * the ranking.
 *
 * Lookup is tried on the raw lowercase form first, then with separators
 * stripped, since the looser spellings people type ("nodejs", "reactjs") do
 * not survive a plain dictionary lookup.
 */
export function canonicalizeSkill(skill: string): string {
  const lowered = skill.trim().toLowerCase();

  const direct = SKILL_ALIASES[lowered];

  if (direct) {
    return direct;
  }

  return SKILL_ALIASES[lowered.replace(/[.\s_-]/g, "")] ?? lowered;
}