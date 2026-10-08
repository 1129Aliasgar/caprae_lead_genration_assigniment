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
export {};
