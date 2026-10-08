"use client";

/**
 * Sonner toast hooks, wrapped.
 *
 * Sonner's `toast()` is already a stable import — this exists so call sites
 * depend on one module rather than reaching into `@/components/ui/sonner`, and
 * so the defaults are stated in a single place.
 *
 * The PRD called for shadcn's `use-toast`. That component is Base-UI only and
 * was unavailable in this project, which shadcn's own CLI redirected to
 * `sonner`; this wraps what is actually installed.
 */

import { toast } from "sonner";

/** Error toast. Redundant-avoidance: the same message twice is one toast. */
export function toastError(message, description) {
  return toast.error(message, {
    description,
    id: `error:${message}`,
  });
}

/** Success toast. */
export function toastSuccess(message, description) {
  return toast.success(message, {
    description,
    id: `success:${message}`,
  });
}

/**
 * Info toast, used for things that are neither success nor failure — a lead
 * whose feedback is recorded but not yet acted on, for instance.
 */
export function toastInfo(message, description) {
  return toast.info(message, {
    description,
    id: `info:${message}`,
  });
}

export { toast };