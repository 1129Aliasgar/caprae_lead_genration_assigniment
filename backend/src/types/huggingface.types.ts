/**
 * @author aliasgarbootwala@gmail.com
 *
 * Shape of a single row returned by the Hugging Face Datasets Server.
 * https://huggingface.co/docs/dataset-viewer/en
 *
 * Every field is nullable — the dataset has holes in all of them — so this is
 * deliberately `string | number | null` per column rather than the `unknown`
 * the endpoint really advertises.
 */

export type HfNullableString = string | null;
export type HfNullableNumber = number | null;

/** One row, snake_case, exactly as the dataset stores it. */
export interface HfJobPostingRow {
  job_id: HfNullableNumber;
  company_id: HfNullableNumber;
  title: HfNullableString;
  description: HfNullableString;
  skills_desc: HfNullableString;
  min_salary: HfNullableNumber;
  max_salary: HfNullableNumber;
  med_salary: HfNullableNumber;
  pay_period: HfNullableString;
  currency: HfNullableString;
  formatted_work_type: HfNullableString;
  formatted_experience_level: HfNullableString;
  location: HfNullableString;
  remote_allowed: HfNullableNumber;
  views: HfNullableNumber;
  applies: HfNullableNumber;
  job_posting_url: HfNullableString;
  application_url: HfNullableString;
  listed_time: HfNullableNumber;
  expiry: HfNullableNumber;
}

/** Envelope around `rows`, plus the row count needed to stop paging. */
export interface HfRowsResponse {
  rows: Array<{
    row_idx: number;
    row: HfJobPostingRow;
  }>;
  num_rows_total: number;
}