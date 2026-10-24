import { describe, expect, it } from "vitest";

import { withDefaultHeaders } from "../src/headers.js";

describe("withDefaultHeaders", () => {
  const defaults = { "content-type": "text/plain", "x-extra": "1" };

  it("returns a fresh object each time so response implementations cannot corrupt the defaults", () => {
    const first = withDefaultHeaders(undefined, defaults) as Record<string, string>;
    first["content-length"] = "99";

    expect(withDefaultHeaders(undefined, defaults)).toEqual(defaults);
    expect(defaults).not.toHaveProperty("content-length");
  });

  it("fills only the headers the caller left unset", () => {
    const merged = withDefaultHeaders(
      { "Content-Type": "application/x-custom" },
      defaults,
    ) as Headers;

    expect(merged.get("content-type")).toBe("application/x-custom");
    expect(merged.get("x-extra")).toBe("1");
  });
});
