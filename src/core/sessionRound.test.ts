import { describe, expect, it } from "vitest";
import { makePair } from "../../tests/factories";
import type { AnswerResult } from "../types";
import { roundAt } from "./matching";
import {
  answerCard,
  answerRound,
  isFinished,
  sessionScore,
  startSession,
} from "./session";

describe("answerRound", () => {
  it("FR-MT-3: answers all words of the round in queue order", () => {
    const pairs = [makePair(), makePair(), makePair()];
    const results = new Map<string, AnswerResult>([
      [pairs[0]?.id ?? "", "correct"],
      [pairs[1]?.id ?? "", "wrong"],
      [pairs[2]?.id ?? "", "correct"],
    ]);

    const { state, answered } = answerRound(startSession(pairs), results);

    expect(answered.map(({ result }) => result)).toEqual([
      "correct",
      "wrong",
      "correct",
    ]);
    expect(state.position).toBe(3);
    expect(isFinished(state)).toBe(true);
    expect(sessionScore(state)).toEqual({ correct: 2, wrong: 1, assisted: 0 });
  });

  it("FR-MT-3: does not re-queue wrong words", () => {
    const pairs = [makePair(), makePair()];
    const results = new Map<string, AnswerResult>(
      pairs.map((pair) => [pair.id, "wrong"]),
    );

    const { state } = answerRound(startSession(pairs), results);

    expect(state.queue).toHaveLength(2);
    expect(isFinished(state)).toBe(true);
  });

  it("only answers the words of the round and keeps the rest pending", () => {
    const pairs = [makePair(), makePair(), makePair()];
    const results = new Map<string, AnswerResult>([
      [pairs[0]?.id ?? "", "correct"],
      [pairs[1]?.id ?? "", "correct"],
    ]);

    const { state, answered } = answerRound(startSession(pairs), results);

    expect(answered).toHaveLength(2);
    expect(state.position).toBe(2);
    expect(isFinished(state)).toBe(false);
  });

  it("stops at the first card without a result", () => {
    const pairs = [makePair(), makePair(), makePair()];
    const results = new Map<string, AnswerResult>([
      [pairs[0]?.id ?? "", "correct"],
      [pairs[2]?.id ?? "", "correct"],
    ]);

    const { state } = answerRound(startSession(pairs), results);

    expect(state.position).toBe(1);
  });

  it("does nothing for an empty result map", () => {
    const session = startSession([makePair()]);

    const { state, answered } = answerRound(session, new Map());

    expect(answered).toEqual([]);
    expect(state).toEqual(session);
  });

  it("does not replace the first result of a repeated card", () => {
    const pair = makePair();
    const afterWrong = answerCard(startSession([pair]), "wrong");

    const { state } = answerRound(afterWrong, new Map([[pair.id, "correct"]]));

    expect(state.firstResults.get(pair.id)).toBe("wrong");
  });

  it("does not change the input state", () => {
    const pairs = [makePair()];
    const session = startSession(pairs);

    answerRound(session, new Map([[pairs[0]?.id ?? "", "correct"]]));

    expect(session.position).toBe(0);
    expect(session.firstResults.size).toBe(0);
  });
});

describe("roundAt", () => {
  const pairs = Array.from({ length: 9 }, () => makePair());

  it("FR-MT-1: returns the first six words at the start", () => {
    expect(roundAt(pairs, 0)).toEqual(pairs.slice(0, 6));
  });

  it("FR-MT-3: returns the next round once the first is answered", () => {
    expect(roundAt(pairs, 6)).toEqual(pairs.slice(6));
  });

  it("FR-MT-4: keeps a single leftover word in the previous round", () => {
    const seven = pairs.slice(0, 7);

    expect(roundAt(seven, 0)).toEqual(seven);
    expect(roundAt(seven, 7)).toEqual([]);
  });

  it("returns nothing for an empty session or a position past the end", () => {
    expect(roundAt([], 0)).toEqual([]);
    expect(roundAt(pairs, 9)).toEqual([]);
  });
});
