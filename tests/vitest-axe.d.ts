/**
 * Type support for the vitest-axe matchers.
 * vitest-axe 0.1.0 only augments the legacy `Vi` namespace, which Vitest 4 no longer reads,
 * so the matchers are registered on the `vitest` module here instead.
 */
import "vitest";
import type { AxeMatchers } from "vitest-axe/matchers";

declare module "vitest" {
  // Declaration merging requires interfaces; the type parameter must match Vitest's declaration.
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type, @typescript-eslint/no-unused-vars -- augmentation only
  interface Assertion<T = unknown> extends AxeMatchers {}
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type -- augmentation only
  interface AsymmetricMatchersContaining extends AxeMatchers {}
}
