import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";
import { App } from "../src/App";
import { buildSharePayload } from "../src/core/shareFormat";
import { encodeSharePayload } from "../src/storage/shareLink";
import { deleteAppDatabase, makeSet, makeSettings } from "./factories";
import { readLibrary, seedDatabase, setWithPairs } from "./seed";

afterEach(async () => {
  vi.restoreAllMocks();
  window.location.hash = "";
  localStorage.clear();
  document.documentElement.removeAttribute("data-theme");
  await deleteAppDatabase();
});

async function sharedHash(name: string): Promise<string> {
  const { set, pairs } = setWithPairs(name, [
    ["hus", "house"],
    ["blå", "blue"],
  ]);
  return `#/share/${await encodeSharePayload(buildSharePayload(set, pairs))}`;
}

describe("share a set via link (NH-5)", () => {
  it("NH-5: creates a link for the set and copies it", async () => {
    const user = userEvent.setup();
    const { set, pairs } = setWithPairs("Week 1", [["hus", "house"]]);
    await seedDatabase({ sets: [set], pairs, settings: makeSettings() });
    window.location.hash = `#/sets/${set.id}`;
    render(<App />);
    const writeText = vi.fn(() => Promise.resolve());
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      configurable: true,
    });

    await user.click(
      await screen.findByRole("button", { name: "Create share link" }),
    );
    const field = await screen.findByLabelText("Share link");
    expect(field).toHaveProperty("value");
    const link = (field as HTMLInputElement).value;
    expect(link).toContain("#/share/");
    await user.click(screen.getByRole("button", { name: "Copy link" }));

    expect(writeText).toHaveBeenCalledWith(link);
    expect(await screen.findByText("Link copied")).toBeInTheDocument();
    Reflect.deleteProperty(navigator, "clipboard");
  });

  it("NH-5: opening a link shows the set and imports it after confirmation", async () => {
    const user = userEvent.setup();
    await seedDatabase({ settings: makeSettings() });
    window.location.hash = await sharedHash("Shared words");
    const { container } = render(<App />);

    expect(await screen.findByText("Shared words")).toBeInTheDocument();
    expect(screen.getByText(/2 word pairs/)).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
    // Nothing is stored until the user confirms.
    expect((await readLibrary()).sets).toHaveLength(0);

    await user.click(screen.getByRole("button", { name: "Add to my sets" }));

    await waitFor(async () => {
      const library = await readLibrary();
      expect(library.sets.map((set) => set.name)).toEqual(["Shared words"]);
      expect(library.pairs.map((pair) => pair.a).sort()).toEqual([
        "blå",
        "hus",
      ]);
    });
    expect(window.location.hash).toBe("#/sets");
  });

  it("NH-5: declining leaves the library untouched", async () => {
    const user = userEvent.setup();
    await seedDatabase({ settings: makeSettings() });
    window.location.hash = await sharedHash("Shared words");
    render(<App />);

    await user.click(await screen.findByRole("button", { name: "Not now" }));

    expect(window.location.hash).toBe("#/sets");
    expect((await readLibrary()).sets).toHaveLength(0);
  });

  it("NH-5: asks what to do when a set with the same name exists", async () => {
    const user = userEvent.setup();
    await seedDatabase({
      sets: [makeSet({ name: "Shared words" })],
      settings: makeSettings(),
    });
    window.location.hash = await sharedHash("Shared words");
    render(<App />);

    const add = await screen.findByRole("button", { name: "Add to my sets" });
    await waitFor(() => {
      expect(add).toBeEnabled();
    });
    await user.click(add);
    expect(
      await screen.findByRole("dialog", { name: "Sets with the same name" }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Import" }));

    await waitFor(async () => {
      expect((await readLibrary()).sets).toHaveLength(2);
    });
  });

  it("NH-5: a damaged link shows an error and imports nothing", async () => {
    await seedDatabase({ settings: makeSettings() });
    window.location.hash = "#/share/zNOTVALID";
    render(<App />);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "damaged or incomplete",
    );
    expect((await readLibrary()).sets).toHaveLength(0);
  });
});
