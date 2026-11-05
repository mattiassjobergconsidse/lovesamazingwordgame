import { describe, expect, it } from "vitest";
import {
  listeningAvailability,
  listeningFeedback,
  resolveListeningResult,
} from "./listening";

const both = { langACode: "sv-SE", langBCode: "en-GB" };

describe("listeningAvailability", () => {
  it("NH-14: is unavailable without speech support", () => {
    expect(listeningAvailability(both, "random", false)).toBe("noSpeech");
  });

  it("NH-14: random direction needs a voice on both sides", () => {
    expect(listeningAvailability(both, "random", true)).toBe("available");
    expect(listeningAvailability({ langACode: "sv-SE" }, "random", true)).toBe(
      "noVoice",
    );
    expect(listeningAvailability({ langBCode: "en-GB" }, "random", true)).toBe(
      "noVoice",
    );
    expect(listeningAvailability({}, "random", true)).toBe("noVoice");
  });

  it("NH-14: a forced direction only needs the spoken (prompt) side's voice", () => {
    expect(listeningAvailability({ langACode: "sv-SE" }, "AtoB", true)).toBe(
      "available",
    );
    expect(listeningAvailability({ langBCode: "en-GB" }, "AtoB", true)).toBe(
      "noVoice",
    );
    expect(listeningAvailability({ langBCode: "en-GB" }, "BtoA", true)).toBe(
      "available",
    );
    expect(listeningAvailability({ langACode: "sv-SE" }, "BtoA", true)).toBe(
      "noVoice",
    );
  });
});

describe("listeningFeedback", () => {
  it("NH-14: tells wrong, almost, helped and clean answers apart", () => {
    expect(listeningFeedback("wrong", "wrong")).toBe("wrong");
    expect(listeningFeedback("assisted", "assisted")).toBe("almost");
    expect(listeningFeedback("correct", "assisted")).toBe("correctWithHelp");
    expect(listeningFeedback("correct", "correct")).toBe("correct");
  });
});

describe("resolveListeningResult", () => {
  it("NH-14: an unaided correct answer stays correct", () => {
    expect(resolveListeningResult("correct", false)).toBe("correct");
  });

  it("NH-14: a replay or revealed text makes a correct answer assisted", () => {
    expect(resolveListeningResult("correct", true)).toBe("assisted");
  });

  it("NH-14: help never changes a wrong or almost answer", () => {
    expect(resolveListeningResult("wrong", true)).toBe("wrong");
    expect(resolveListeningResult("assisted", true)).toBe("assisted");
    expect(resolveListeningResult("assisted", false)).toBe("assisted");
  });
});
