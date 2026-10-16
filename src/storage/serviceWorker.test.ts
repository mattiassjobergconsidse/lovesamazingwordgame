import { describe, expect, it, vi } from "vitest";
import { registerServiceWorker } from "./serviceWorker";

function fakeContainer(
  register: () => Promise<unknown>,
): ServiceWorkerContainer {
  return { register } as unknown as ServiceWorkerContainer;
}

describe("registerServiceWorker", () => {
  it("NH-1: registers the worker with the given URL", async () => {
    const register = vi.fn(() => Promise.resolve({}));

    const status = await registerServiceWorker(
      "/base/sw.js",
      fakeContainer(register),
    );

    expect(status).toBe("registered");
    expect(register).toHaveBeenCalledWith("/base/sw.js", { scope: "./" });
  });

  it("NH-1: reports unsupported browsers", async () => {
    expect(await registerServiceWorker("/sw.js", null)).toBe("unsupported");
  });

  it("NH-1: detects missing support from the environment by default", async () => {
    expect(await registerServiceWorker("/sw.js")).toBe("unsupported");
  });

  it("NH-1: reports a failed registration instead of throwing", async () => {
    const container = fakeContainer(() => Promise.reject(new Error("denied")));

    expect(await registerServiceWorker("/sw.js", container)).toBe("failed");
  });
});
