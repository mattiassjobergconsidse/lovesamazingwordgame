import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";
import { App } from "../src/App";
import { deleteAppDatabase, makeSettings } from "./factories";
import { readLibrary, seedDatabase, setWithPairs } from "./seed";

class FakeUtterance {
  lang = "";
  readonly text: string;
  constructor(text: string) {
    this.text = text;
  }
}

function stubSpeech() {
  const speak = vi.fn();
  vi.stubGlobal("SpeechSynthesisUtterance", FakeUtterance);
  vi.stubGlobal("speechSynthesis", {
    getVoices: () => [{ lang: "sv-SE" }, { lang: "en-GB" }],
    speak,
    cancel: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  });
  return speak;
}

beforeEach(() => {
  window.location.hash = "#/train/listening";
});

afterEach(async () => {
  vi.unstubAllGlobals();
  localStorage.clear();
  document.documentElement.removeAttribute("data-theme");
  await deleteAppDatabase();
});

const WORDS: [string, string][] = [
  ["hund", "dog"],
  ["katt", "cat"],
];

async function seedWords(
  words: [string, string][],
  codes: { langACode?: string; langBCode?: string } = {
    langACode: "sv-SE",
    langBCode: "en-GB",
  },
  directionMode: "AtoB" | "random" = "AtoB",
) {
  const { set, pairs } = setWithPairs("Week 1", words);
  await seedDatabase({
    sets: [{ ...set, ...codes }],
    pairs,
    settings: makeSettings({ activeSetId: set.id, directionMode }),
  });
}

/** The word the app spoke most recently. */
function lastSpoken(speak: ReturnType<typeof vi.fn>): string {
  const utterance = speak.mock.calls.at(-1)?.[0] as FakeUtterance;
  return utterance.text;
}

/** The translation the player has to give for a spoken word of WORDS. */
function translationOf(spoken: string): string {
  const pair = WORDS.find(([a]) => a === spoken);
  if (pair === undefined) {
    throw new Error(`Unexpected spoken word: ${spoken}`);
  }
  return pair[1];
}

async function startSession(user: ReturnType<typeof userEvent.setup>) {
  await user.click(await screen.findByRole("button", { name: "Start" }));
}

describe("listening mode", () => {
  it("NH-14: the mode card is disabled with a message when the browser cannot speak", async () => {
    window.location.hash = "#/train";
    await seedWords(WORDS);
    render(<App />);

    const card = await screen.findByRole("button", { name: /Listening/ });

    expect(card).toBeDisabled();
    expect(
      screen.getByText(
        "Listening needs speech, which this browser does not support.",
      ),
    ).toBeVisible();
  });

  it("NH-14: the mode card is disabled with a message when the set has no voice language", async () => {
    stubSpeech();
    window.location.hash = "#/train";
    await seedWords(WORDS, { langBCode: "en-GB" });
    render(<App />);

    const card = await screen.findByRole("button", { name: /Listening/ });

    expect(card).toBeDisabled();
    expect(
      screen.getByText(/Listening needs a voice language for both languages/),
    ).toBeVisible();
  });

  it("NH-14: a forced direction only needs the spoken language's voice, so the card links on", async () => {
    stubSpeech();
    window.location.hash = "#/train";
    await seedWords(WORDS, { langACode: "sv-SE" }, "AtoB");
    render(<App />);

    expect(
      await screen.findByRole("link", { name: /Listening/ }),
    ).toHaveAttribute("href", "#/train/listening");
  });

  it("NH-14: opening the mode directly explains why it cannot start", async () => {
    await seedWords(WORDS);
    render(<App />);

    expect(
      await screen.findByText(
        "Listening needs speech, which this browser does not support.",
      ),
    ).toBeVisible();
    expect(
      screen.getByRole("link", { name: "Open the set editor" }),
    ).toBeVisible();
    expect(screen.queryByRole("button", { name: "Start" })).toBeNull();
  });

  it("NH-14: speaks the prompt word without showing it, then the correct translation is correct", async () => {
    const speak = stubSpeech();
    await seedWords(WORDS);
    const user = userEvent.setup();
    render(<App />);

    await startSession(user);
    await waitFor(() => {
      expect(speak).toHaveBeenCalledTimes(1);
    });
    const spoken = lastSpoken(speak);
    const word = translationOf(spoken);
    expect(speak).toHaveBeenCalledWith(
      expect.objectContaining({ lang: "sv-SE" }),
    );
    expect(screen.queryByText(`The word is: ${spoken}`)).toBeNull();
    expect(screen.getAllByRole("button", { name: /^(dog|cat)$/ })).toHaveLength(
      2,
    );

    await user.click(screen.getByRole("button", { name: word }));

    expect(
      screen.getByText(`Correct! The translation is ${word}`),
    ).toBeVisible();
    expect(screen.getByRole("button", { name: "Next" })).toHaveFocus();
    await user.keyboard("{Enter}");
    await waitFor(() => {
      expect(speak).toHaveBeenCalledTimes(2);
    });
    await user.click(
      screen.getByRole("button", { name: translationOf(lastSpoken(speak)) }),
    );
    await user.keyboard("{Enter}");

    expect(
      await screen.findByRole("heading", { name: "Session complete" }),
    ).toBeVisible();
    const { progress } = await readLibrary();
    expect(progress).toHaveLength(2);
    expect(progress.every((record) => record.correct === 1)).toBe(true);
  });

  it("NH-14: choosing with the number keys works and a wrong choice is recorded as wrong", async () => {
    const speak = stubSpeech();
    await seedWords(WORDS);
    const user = userEvent.setup();
    render(<App />);
    await startSession(user);
    await waitFor(() => {
      expect(speak).toHaveBeenCalled();
    });
    const spoken = lastSpoken(speak);
    const word = translationOf(spoken);
    const options = screen.getAllByRole("button", { name: /^(dog|cat)$/ });
    const wrongIndex = options.findIndex(
      (option) => !option.textContent.includes(word),
    );

    await user.keyboard(String(wrongIndex + 1));

    expect(
      screen.getByText(`Not quite. The translation was: ${word}`),
    ).toBeVisible();
    expect(screen.getByText(`You heard (Svenska): ${spoken}`)).toBeVisible();
  });

  it("NH-14: R hears the word again and a correct answer then only counts as assisted", async () => {
    const speak = stubSpeech();
    await seedWords(WORDS);
    const user = userEvent.setup();
    render(<App />);
    await startSession(user);
    await waitFor(() => {
      expect(speak).toHaveBeenCalledTimes(1);
    });
    const word = translationOf(lastSpoken(speak));

    await user.keyboard("r");
    expect(speak).toHaveBeenCalledTimes(2);
    await user.click(screen.getByRole("button", { name: word }));

    expect(
      screen.getByText(`Correct, with help. The translation is ${word}`),
    ).toBeVisible();
    // An assisted answer is not auto-advanced; the player continues on purpose.
    await user.keyboard("{Enter}");
    await waitFor(() => {
      expect(speak).toHaveBeenCalledTimes(3);
    });
    const { progress } = await readLibrary();
    expect(progress[0]).toMatchObject({ correct: 0, streak: 0 });
  });

  it("NH-14: the replay button hears the word again", async () => {
    const speak = stubSpeech();
    await seedWords(WORDS);
    const user = userEvent.setup();
    render(<App />);
    await startSession(user);
    await waitFor(() => {
      expect(speak).toHaveBeenCalledTimes(1);
    });
    const word = lastSpoken(speak);

    await user.click(screen.getByRole("button", { name: /Hear it again/ }));

    expect(speak).toHaveBeenCalledTimes(2);
    expect(lastSpoken(speak)).toBe(word);
  });

  it("NH-14: showing the word reveals it and makes a correct answer assisted", async () => {
    const speak = stubSpeech();
    await seedWords(WORDS);
    const user = userEvent.setup();
    render(<App />);
    await startSession(user);
    await waitFor(() => {
      expect(speak).toHaveBeenCalled();
    });
    const spoken = lastSpoken(speak);
    const word = translationOf(spoken);

    await user.click(screen.getByRole("button", { name: "Show the word" }));
    expect(screen.getByText(`The word is: ${spoken}`)).toBeVisible();
    await user.click(screen.getByRole("button", { name: word }));

    expect(
      screen.getByText(`Correct, with help. The translation is ${word}`),
    ).toBeVisible();
  });

  it("NH-14: a single word is practised by typing, and a typed answer is checked", async () => {
    const speak = stubSpeech();
    await seedWords([["hund", "dog"]]);
    const user = userEvent.setup();
    render(<App />);

    await startSession(user);

    expect(
      screen.queryByRole("button", { name: "Type it instead" }),
    ).toBeNull();
    expect(
      screen.getByLabelText("Type the translation (English)"),
    ).toHaveFocus();
    await user.keyboard("dog{Enter}");

    expect(screen.getByText("Correct! The translation is dog")).toBeVisible();
    expect(speak).toHaveBeenCalledWith(
      expect.objectContaining({ text: "hund", lang: "sv-SE" }),
    );
    expect(
      await screen.findByRole(
        "heading",
        { name: "Session complete" },
        { timeout: 3000 },
      ),
    ).toBeVisible();
    const { progress } = await readLibrary();
    expect(progress[0]).toMatchObject({ correct: 1, box: 1 });
  });

  it("NH-14: a wrong typed answer shows the word and is recorded as wrong", async () => {
    stubSpeech();
    await seedWords([["hund", "dog"]]);
    const user = userEvent.setup();
    render(<App />);
    await startSession(user);

    await user.type(
      screen.getByLabelText("Type the translation (English)"),
      "cog{Enter}",
    );

    expect(
      screen.getByText("Not quite. The translation was: dog"),
    ).toBeVisible();
    await user.keyboard("{Enter}");
    // FR-TRN-7: a missed word comes back once.
    expect(
      await screen.findByLabelText("Type the translation (English)"),
    ).toBeVisible();
    const { progress } = await readLibrary();
    expect(progress[0]).toMatchObject({ wrong: 1 });
  });

  it("NH-14: the R key is typed as a letter, not a replay, while typing", async () => {
    const speak = stubSpeech();
    await seedWords([["bil", "car"]]);
    const user = userEvent.setup();
    render(<App />);
    await startSession(user);
    await waitFor(() => {
      expect(speak).toHaveBeenCalledTimes(1);
    });

    await user.keyboard("car");

    expect(screen.getByLabelText("Type the translation (English)")).toHaveValue(
      "car",
    );
    expect(speak).toHaveBeenCalledTimes(1);
  });

  it("NH-14: the player can switch between choosing and typing", async () => {
    stubSpeech();
    await seedWords(WORDS);
    const user = userEvent.setup();
    render(<App />);
    await startSession(user);

    await user.click(screen.getByRole("button", { name: "Type it instead" }));
    expect(
      screen.getByLabelText("Type the translation (English)"),
    ).toHaveFocus();
    expect(screen.queryByRole("list", { name: /Choose the/ })).toBeNull();

    await user.click(
      screen.getByRole("button", { name: "Choose from options instead" }),
    );
    expect(
      screen.getByRole("list", { name: "Choose the translation (English)" }),
    ).toBeVisible();
  });

  it("NH-14: has no accessibility violations while a card is shown", async () => {
    stubSpeech();
    await seedWords(WORDS);
    const user = userEvent.setup();
    render(<App />);
    await startSession(user);
    await screen.findByRole("list", { name: /Choose the translation/ });

    expect(await axe(document.body)).toHaveNoViolations();
  });
});
