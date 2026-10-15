import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import {
  navigate,
  parseRoute,
  routeToHash,
  useRoute,
  type Route,
} from "./router";

afterEach(() => {
  window.location.hash = "";
});

describe("parseRoute", () => {
  it.each<[string, Route]>([
    ["", { name: "home" }],
    ["#", { name: "home" }],
    ["#/", { name: "home" }],
    ["#/sets", { name: "sets" }],
    ["#/sets/", { name: "sets" }],
    ["#/sets/abc-1", { name: "setEditor", id: "abc-1" }],
    ["#/sets/a%20b", { name: "setEditor", id: "a b" }],
    ["#/train", { name: "train" }],
    ["#/train/flashcards", { name: "trainMode", mode: "flashcards" }],
    ["#/train/quiz", { name: "trainMode", mode: "quiz" }],
    ["#/train/matching", { name: "trainMode", mode: "matching" }],
    ["#/train/writing", { name: "trainMode", mode: "writing" }],
    ["#/stats", { name: "stats" }],
    ["#/settings", { name: "settings" }],
  ])("maps %j to a route", (hash, expected) => {
    expect(parseRoute(hash)).toEqual(expected);
  });

  it.each([
    "#/unknown",
    "#/train/dancing",
    "#/sets/a/b",
    "#/stats/extra",
    "#/settings/extra",
    "#/sets/%E0%A4%A",
  ])("falls back to home for %j", (hash) => {
    expect(parseRoute(hash)).toEqual({ name: "home" });
  });
});

describe("routeToHash", () => {
  it("is the inverse of parseRoute", () => {
    const routes: Route[] = [
      { name: "home" },
      { name: "sets" },
      { name: "setEditor", id: "a b/c" },
      { name: "train" },
      { name: "trainMode", mode: "writing" },
      { name: "stats" },
      { name: "settings" },
    ];

    for (const route of routes) {
      expect(parseRoute(routeToHash(route))).toEqual(route);
    }
  });
});

describe("useRoute", () => {
  it("follows navigation", () => {
    const { result } = renderHook(() => useRoute());
    expect(result.current).toEqual({ name: "home" });

    act(() => {
      navigate({ name: "stats" });
      window.dispatchEvent(new HashChangeEvent("hashchange"));
    });

    expect(result.current).toEqual({ name: "stats" });
  });
});
