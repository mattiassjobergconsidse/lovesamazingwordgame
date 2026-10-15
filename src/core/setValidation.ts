/** Limits from the domain model (SPEC.md section 3). */
export const SET_NAME_MAX = 60;
export const LANGUAGE_LABEL_MAX = 30;

/** The editable text fields of a set. */
export interface SetFields {
  readonly name: string;
  readonly langA: string;
  readonly langB: string;
}

export type FieldError = "required" | "tooLong" | "duplicate";

/** Per-field problems; a missing key means the field is valid. */
export interface SetFieldErrors {
  readonly name?: FieldError;
  readonly langA?: FieldError;
  readonly langB?: FieldError;
}

/** Trims every field (FR-SET-1). */
export function normalizeSetFields(fields: SetFields): SetFields {
  return {
    name: fields.name.trim(),
    langA: fields.langA.trim(),
    langB: fields.langB.trim(),
  };
}

function checkLength(value: string, max: number): FieldError | undefined {
  if (value === "") {
    return "required";
  }
  return value.length > max ? "tooLong" : undefined;
}

function sameName(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

/**
 * Validates set fields (FR-SET-1, FR-SET-2).
 *
 * @param fields Raw user input; whitespace is trimmed before checking.
 * @param otherNames Names of all other sets; compared case-insensitively.
 * @returns The problems found; an empty object when everything is valid.
 */
export function validateSetFields(
  fields: SetFields,
  otherNames: readonly string[],
): SetFieldErrors {
  const { name, langA, langB } = normalizeSetFields(fields);
  const nameError =
    checkLength(name, SET_NAME_MAX) ??
    (otherNames.some((other) => sameName(other, name))
      ? "duplicate"
      : undefined);
  const langAError = checkLength(langA, LANGUAGE_LABEL_MAX);
  const langBError = checkLength(langB, LANGUAGE_LABEL_MAX);
  return {
    ...(nameError === undefined ? {} : { name: nameError }),
    ...(langAError === undefined ? {} : { langA: langAError }),
    ...(langBError === undefined ? {} : { langB: langBError }),
  };
}

/**
 * Finds a free set name by appending a counter to `base` (FR-SET-4).
 *
 * @param base Preferred name, e.g. "Copy of Week 1".
 * @param existingNames Names already in use; compared case-insensitively.
 * @returns `base` if free, otherwise `base (2)`, `base (3)`, ... truncated to the name limit.
 */
export function makeUniqueName(
  base: string,
  existingNames: readonly string[],
): string {
  const isFree = (candidate: string) =>
    !existingNames.some((existing) => sameName(existing, candidate));
  const trimmedBase = base.trim().slice(0, SET_NAME_MAX).trim();
  if (isFree(trimmedBase)) {
    return trimmedBase;
  }
  for (let counter = 2; ; counter += 1) {
    const suffix = ` (${String(counter)})`;
    const candidate = `${trimmedBase.slice(0, SET_NAME_MAX - suffix.length).trim()}${suffix}`;
    if (isFree(candidate)) {
      return candidate;
    }
  }
}
