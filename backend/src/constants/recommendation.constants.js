/**
 * @author aliasgarbootwala@gmail.com
 */
import { WeightType } from "./enums.js";
/**
 * Shipping weights. Sums to 1.0 — `finalScore` is a straight weighted mean, so
 * a user overriding one weight has to compensate in another or the ceiling moves.
 */
export const DEFAULT_WEIGHTS = {
    [WeightType.TITLE_MATCH]: 0.3,
    [WeightType.SKILL_MATCH]: 0.25,
    [WeightType.SALARY_FIT]: 0.2,
    [WeightType.LOCATION_FIT]: 0.1,
    [WeightType.EXPERIENCE_FIT]: 0.1,
    [WeightType.LEAD_QUALITY]: 0.05,
};
/** Hard cap on returned leads, and the default when `topN` is omitted. */
export const DEFAULT_TOP_N = 20;
export const MAX_TOP_N = 100;
/**
 * Hugging Face Datasets Server, paged 100 rows at a time. The dataset ships33k+
 * rows, so seeding without `--limit` pulls the whole thing.
 */
export const HF_DATASET_URL = "https://datasets-server.huggingface.co/rows";
export const HF_DATASET_NAME = "xanderios/linkedin-job-postings";
export const HF_PAGE_SIZE = 100;
