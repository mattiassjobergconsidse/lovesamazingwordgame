import { describe, expect, it } from "vitest";
import {
  LANGUAGE_LABEL_MAX,
  SET_NAME_MAX,
  makeUniqueName,
  normalizeSetFields,
  validateSetFields,
} from "./setValidation";

const valid = { name: "Week 1", langA: "Svenska", langB: "English" };

describe("validateSetFields", () => {
  it("FR-SET-1: accepts a complete set", () => {
    expect(validateSetFields(valid, [])).toEqual({});
  });

  it("FR-SET-1: rejects empty and whitespace-only fields", () => {
    expect(
      validateSetFields({ name: "   ", langA: "", langB: " \t" }, []),
    ).toEqual({ name: "required", langA: "required", langB: "required" });
  });

  it("FR-SET-1: rejects a name that is already used, ignoring case and spacing", () => {
    expect(
      validateSetFields({ ...valid, name: "  WEEK 1 " }, ["week 1"]),
    ).toEqual({ name: "duplicate" });
  });

  it("FR-SET-1: rejects over-long name and labels but accepts the limits", () => {
    expect(
      validateSetFields(
        {
          name: "x".repeat(SET_NAME_MAX + 1),
          langA: "y".repeat(LANGUAGE_LABEL_MAX + 1),
          langB: "z".repeat(LANGUAGE_LABEL_MAX),
        },
        [],
      ),
    ).toEqual({ name: "tooLong", langA: "tooLong" });
    expect(
      validateSetFields({ ...valid, name: "x".repeat(SET_NAME_MAX) }, []),
    ).toEqual({});
  });

  it("FR-SET-2: handles Swedish characters", () => {
    expect(
      validateSetFields({ name: "Åäö", langA: "Svenska", langB: "Español" }, [
        "åÄÖ",
      ]),
    ).toEqual({ name: "duplicate" });
  });
});

describe("normalizeSetFields", () => {
  it("FR-SET-1: trims all fields", () => {
    expect(
      normalizeSetFields({ name: " a ", langA: " b", langB: "c " }),
    ).toEqual({ name: "a", langA: "b", langB: "c" });
  });
});

describe("makeUniqueName", () => {
  it("FR-SET-4: keeps a free name", () => {
    expect(makeUniqueName("Copy of Week 1", ["Week 1"])).toBe("Copy of Week 1");
  });

  it("FR-SET-4: appends a counter until the name is free", () => {
    expect(makeUniqueName("Copy of A", ["copy of a", "Copy of A (2)"])).toBe(
      "Copy of A (3)",
    );
  });

  it("FR-SET-4: stays within the name limit", () => {
    const long = "x".repeat(SET_NAME_MAX);
    const result = makeUniqueName(`Copy of ${long}`, []);
    expect(result).toHaveLength(SET_NAME_MAX);
    const second = makeUniqueName(result, [result]);
    expect(second.length).toBeLessThanOrEqual(SET_NAME_MAX);
    expect(second.endsWith("(2)")).toBe(true);
  });
});
