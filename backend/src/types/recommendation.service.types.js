/**
 * @author aliasgarbootwala@gmail.com
 *
 * Types for the recommendation pipeline.
 *
 * `PipelineStage` is mongoose's own union of aggregation stages, re-exported so
 * pipeline builders can be typed without every consumer importing mongoose. It
 * is a discriminated union of *known* stages, so `$match` and `$addFields` are
 * checked against the driver's own definitions.
 *
 * The one concession to looseness: `$addFields` expressions are assembled
 * dynamically, and the driver's expression types are narrow enough that a
 * computed `$cond` tree would need a cast at every level. Those expressions are
 * built as `Record<string, unknown>` and cast back to `PipelineStage` at the
 * return, which keeps the looseness in a few known places rather than spread
 * through the builders.
 */
export {};
