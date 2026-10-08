/**
 * @author aliasgarbootwala@gmail.com
 *
 * Vocabulary used by the extractor: the job titles it recognises, the education
 * keywords it ranks, and the place names it looks for.
 *
 * This is a curated list, and the reason it is a list rather than a model is
 * worth stating plainly: extraction has to be instant, deterministic and free.
 * An LLM version of this was built and removed — a free-tier chat model timed
 * out at 30s on a 4,877-character resume, and the fallback path that replaced it
 * was measurably worse on titles. So the cost of this file is real: a role
 * family that is not listed here extracts no title, and the title hard filter
 * then matches nothing. When a dataset's common titles are uncovered, add them.
 *
 * Education keywords are ordered most to least specialised. `HIGHEST` wins
 * outright — a candidate listing both a B.S. and an MBA is reported as a
 * Masters, which is what a recommender filtering on seniority wants.
 */
import { EducationLevel } from "./enums.js";
export const TITLE_PATTERNS = [
    // ---- engineering ----
    {
        label: "Software Engineer",
        pattern: /\b(?:senior|sr\.?|junior|jr\.?|lead|principal|staff|associate|intern)?\s*(?:software|applications?|systems?|product)?\s*(?:engineer|developer|programmer|dev)\b/i,
    },
    {
        label: "Frontend Engineer",
        pattern: /\b(?:front[\s-]?end|client[\s-]?side|ui|web)\s*(?:engineer|developer|dev)\b/i,
    },
    {
        label: "Backend Engineer",
        pattern: /\b(?:back[\s-]?end|server[\s-]?side)\s*(?:engineer|developer|dev)\b/i,
    },
    {
        label: "Full Stack Engineer",
        pattern: /\bfull[\s-]?stack\s*(?:engineer|developer|dev)\b|\b(?:engineer|developer|dev)\b[\s\S]{0,20}\bfull[\s-]?stack\b/i,
    },
    {
        label: "Mobile Engineer",
        pattern: /\b(?:mobile|android|ios|react native|flutter)\s*(?:engineer|developer|dev)\b/i,
    },
    {
        label: "DevOps Engineer",
        pattern: /\b(?:devops|site reliability|sre|platform|infrastructure|cloud)\s*(?:engineer|developer|dev)\b/i,
    },
    {
        label: "Data Engineer",
        pattern: /\bdata\s*(?:engineer|developer|architect)\b/i,
    },
    {
        label: "Data Scientist",
        pattern: /\b(?:data\s*scientist|machine learning scientist|ml\s*(?:engineer|scientist))\b/i,
    },
    {
        label: "QA Engineer",
        pattern: /\b(?:qa|quality assurance|sdet|test automation)\s*(?:engineer|analyst|developer)\b/i,
    },
    {
        label: "Security Engineer",
        pattern: /\b(?:security|application security|appsec|infosec)\s*(?:engineer|analyst|architect|consultant)\b/i,
    },
    {
        label: "Embedded Engineer",
        pattern: /\b(?:embedded|firmware|hardware)\s*(?:engineer|developer|architect)\b/i,
    },
    {
        label: "Solutions Architect",
        pattern: /\b(?:solutions?|enterprise|technical)\s*architect\b|\barchitect\b[\s\S]{0,20}\bsolutions?\b/i,
    },
    {
        label: "Engineering Manager",
        pattern: /\b(?:engineering|engineering team)\s*manager\b|\b(?:senior|sr\.?)\s*dev(?:elopment)?\s*manager\b/i,
    },
    // ---- product & design ----
    {
        label: "Product Manager",
        pattern: /\b(?:senior|sr\.?|junior|jr\.?|lead|principal|group)?\s*product\s*manager\b/i,
    },
    {
        label: "Product Designer",
        pattern: /\b(?:senior|sr\.?|junior|jr\.?|lead|principal)?\s*(?:product|ux|ui|experience)\s*designer\b/i,
    },
    {
        label: "UX Designer",
        pattern: /\b(?:ux|user experience)\s*(?:designer|researcher)\b/i,
    },
    {
        label: "UX Researcher",
        pattern: /\b(?:user experience|ux)\s*researcher\b/i,
    },
    {
        label: "Product Owner",
        pattern: /\bproduct\s*owner\b/i,
    },
    {
        label: "Technical Writer",
        pattern: /\b(?:technical|documentation|content)\s*(?:writer|writer-engineer)\b/i,
    },
    // ---- leadership / data ----
    {
        label: "Engineering Lead",
        pattern: /\b(?:head|chief)\s*of\s*engineering\b|\bvp\s*of\s*engineering\b|\bcto\b/i,
    },
    {
        label: "Data Analyst",
        pattern: /\b(?:business|senior|junior)?\s*data\s*analyst\b/i,
    },
    {
        label: "Business Analyst",
        pattern: /\b(?:business|systems?)\s*analyst\b/i,
    },
    /*
     * ---- sales, account management, business development ----
     *
     * Added after a sales resume was measured against this dataset: it extracted
     * exactly one title — "Engineering Manager", from a pattern matching
     * "manager" near "software" — and then filtered itself down to nothing.
     * These families are not a minority of the data; Global Account Manager is
     * the single most common title in it.
     */
    {
        label: "Account Manager",
        pattern: /\b(?:global|key|strategic|senior|sr\.?|major|technical|partner|regional|named)?\s*account\s*manager\b/i,
    },
    {
        label: "Sales Manager",
        pattern: /\b(?:senior|sr\.?|regional|national|district|territory|inside)?\s*sales\s*manager\b/i,
    },
    {
        label: "Sales Director",
        pattern: /\b(?:senior|sr\.?|national|regional|global|vice|vice president|vp)?\s*sales\s*director\b/i,
    },
    {
        label: "Sales Development Representative",
        pattern: /\bsales\s*development\s*(?:representative|rep|manager|associate|sdr)\b|\bbusiness\s*development\s*(?:representative|rep)\b/i,
    },
    {
        label: "Business Development Manager",
        pattern: /\b(?:senior|sr\.?)?\s*(?:business\s*development|bd)\s*manager\b/i,
    },
    {
        label: "Sales Representative",
        pattern: /\b(?:senior|sr\.?)?\s*(?:sales\s*representative|sales\s*rep|account\s*executive|outside\s*sales)\b/i,
    },
    // ---- finance, accounting, legal ----
    {
        label: "Accountant",
        pattern: /\b(?:senior|sr\.?|junior|jr\.?|staff|lead|principal)?\s*accountant\b/i,
    },
    {
        label: "Financial Analyst",
        pattern: /\b(?:senior|sr\.?|junior|jr\.?|staff|lead)?\s*(?:financial|finance)\s*analyst\b/i,
    },
    {
        label: "Controller",
        pattern: /\b(?:senior|sr\.?)?\s*controller\b/i,
    },
    {
        label: "Paralegal",
        pattern: /\b(?:senior|sr\.?)?\s*paralegal\b/i,
    },
    // ---- healthcare ----
    {
        label: "Registered Nurse",
        pattern: /\b(?:registered\s*nurse|med\/surg\s*rn|rn|staff\s*nurse|licensed\s*vocational\s*nurse|lvn)\b/i,
    },
    {
        label: "Nurse Practitioner",
        pattern: /\b(?:nurse\s*practitioner|fnp|family\s*nurse\s*practitioner)\b/i,
    },
    {
        label: "Medical Assistant",
        pattern: /\b(?:medical|clinical)\s*assistant\b/i,
    },
    {
        label: "Dental Hygienist",
        pattern: /\bdental\s*hygienist\b|\brdh\b/i,
    },
    {
        label: "Physical Therapist",
        pattern: /\b(?:physical\s*therapist|physical\s*therapy|dpt)\b/i,
    },
    {
        label: "Pharmacist",
        pattern: /\b(?:staff|clinical|senior)?\s*pharmacist\b|\brph\b/i,
    },
    // ---- education, social work, hospitality, trades, operations ----
    {
        label: "Teacher",
        pattern: /\b(?:classroom\s*)?(?:elementary|high\s*school|middle\s*school|secondary|special\s*education)\s*teacher\b|\bteacher\b/i,
    },
    {
        label: "Counselor",
        pattern: /\b(?:school|guidance|school\s*counselor|mental\s*health|clinical)\s*counselor\b|\bcounselor\b/i,
    },
    {
        label: "Social Worker",
        pattern: /\b(?:case\s*manager|child\s*welfare|youth\s*justice|social\s*worker|social\s*services?)\b/i,
    },
    {
        label: "Cook",
        pattern: /\b(?:line\s*cook|chef|short[\s-]order\s*cook|cook|culinary)\b/i,
    },
    {
        label: "Customer Service Representative",
        pattern: /\bcustomer\s*(?:service|support|success|care)\s*(?:representative|rep|agent|specialist|associate)\b/i,
    },
    {
        label: "Project Manager",
        pattern: /\b(?:senior|sr\.?|junior|jr\.?|assistant|associate|technical|it|marketing)?\s*project\s*manager\b|\bprogram\s*manager\b/i,
    },
    {
        label: "Operations Manager",
        pattern: /\b(?:senior|sr\.?)?\s*(?:operations|ops|operational)\s*manager\b/i,
    },
];
/**
 * Education keywords, most specialised first.
 *
 * The extractor returns the first level that matches anywhere in the education
 * region, so ordering here is the precedence rule — `HIGHEST` does not need to
 * be a numeric comparison.
 */
export const EDUCATION_KEYWORDS = [
    {
        level: EducationLevel.PHD,
        keywords: [
            "phd",
            "ph.d",
            "doctorate",
            "doctoral",
            "doctor of philosophy",
            "dphil",
            "d.phil",
        ],
    },
    {
        level: EducationLevel.MASTERS,
        keywords: [
            "master",
            "masters",
            "master's",
            "msc",
            "m.sc",
            "ms",
            "m.s",
            "mtech",
            "m.tech",
            "meng",
            "mba",
            "master of science",
            "master of arts",
            "master of technology",
            "master of engineering",
            "postgraduate",
            "post graduate",
        ],
    },
    {
        level: EducationLevel.BACHELORS,
        keywords: [
            "bachelor",
            "bachelors",
            "bachelor's",
            "bsc",
            "b.sc",
            "bs",
            "b.s",
            "btech",
            "b.tech",
            "b.e",
            "be",
            "bachelor of science",
            "bachelor of arts",
            "bachelor of technology",
            "bachelor of engineering",
            "undergraduate",
            "graduate",
        ],
    },
    {
        level: EducationLevel.ASSOCIATE,
        keywords: [
            "associate",
            "associate's",
            "associate degree",
            "a.a",
            "a.s",
            "diploma",
            "foundation degree",
            "hnd",
            "htt",
        ],
    },
    {
        level: EducationLevel.HIGH_SCHOOL,
        keywords: [
            "high school",
            "highschool",
            "secondary school",
            "ged",
            "gcse",
            "gce",
            "a-levels",
            "a levels",
            "ssc",
            "hsc",
            "10th",
            "12th",
        ],
    },
];
/** Reported when no education keyword is found at all. */
export const UNKNOWN_EDUCATION_LEVEL = EducationLevel.HIGH_SCHOOL;
/**
 * Place names searched for in the resume, grouped so the caller can prefer a
 * specific hit. Lowercased — matching is done against a lowercased haystack.
 */
export const CITY_DICTIONARY = [
    // north america
    "new york",
    "nyc",
    "brooklyn",
    "san francisco",
    "sf",
    "palo alto",
    "mountain view",
    "san jose",
    "santa clara",
    "los angeles",
    "san diego",
    "seattle",
    "bellevue",
    "portland",
    "denver",
    "boulder",
    "austin",
    "dallas",
    "houston",
    "philadelphia",
    "boston",
    "cambridge",
    "chicago",
    "atlanta",
    "miami",
    "orlando",
    "tampa",
    "raleigh",
    "charlotte",
    "nashville",
    "pittsburgh",
    "columbus",
    "detroit",
    "minneapolis",
    "salt lake city",
    "las vegas",
    "phoenix",
    "san juan",
    "toronto",
    "vancouver",
    "montreal",
    "ottawa",
    "waterloo",
    "calgary",
    "edmonton",
    "mexico city",
    // europe
    "london",
    "manchester",
    "bristol",
    "edinburgh",
    "glasgow",
    "dublin",
    "amsterdam",
    "rotterdam",
    "berlin",
    "munich",
    "hamburg",
    "paris",
    "lyon",
    "toulouse",
    "madrid",
    "barcelona",
    "lisbon",
    "porto",
    "milan",
    "rome",
    "zurich",
    "geneva",
    "vienna",
    "prague",
    "warsaw",
    "stockholm",
    "oslo",
    "copenhagen",
    "helsinki",
    "brussels",
    "budapest",
    "bucharest",
    "athens",
    // asia pacific
    "bangalore",
    "bengaluru",
    "hyderabad",
    "pune",
    "mumbai",
    "delhi",
    "noida",
    "gurgaon",
    "chennai",
    "kolkata",
    "ahmedabad",
    "jaipur",
    "singapore",
    "tokyo",
    "osaka",
    "seoul",
    "beijing",
    "shanghai",
    "shenzhen",
    "hangzhou",
    "taipei",
    "sydney",
    "melbourne",
    "auckland",
    // middle east / africa
    "dubai",
    "abu dhabi",
    "doha",
    "riyadh",
    "tel aviv",
    "jerusalem",
    "cairo",
    "lagos",
    "nairobi",
    "johannesburg",
    "cape town",
];
/** Tokens that mean "does not need to be in an office". */
export const REMOTE_TOKENS = ["remote", "work from home", "wfh", "distributed"];
/** Canonical value emitted when a resume says remote. */
export const REMOTE_LOCATION_LABEL = "remote";
