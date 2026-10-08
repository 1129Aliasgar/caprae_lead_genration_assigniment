/**
 * @author aliasgarbootwala@gmail.com
 *
 * Service contracts for the profile extraction stage.
 *
 * Separate from `profile.types.ts` because these are the *inputs and results*
 * of one operation, whereas `profile.types.ts` describes the data as it is
 * stored on the user document. They are the same shape here — extraction
 * writes what it returns — but keeping the two files separate means a change
 * to storage does not silently alter the extraction contract.
 */
export {};
