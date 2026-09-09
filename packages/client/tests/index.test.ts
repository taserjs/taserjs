import { describe, it, expect } from "vitest";
import * as client from "../src/index.js";

describe("@taserjs/client", () => {
  it("loads client module", () => {
    expect(client).toBeDefined();
  });
});
