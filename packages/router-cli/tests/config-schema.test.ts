import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { generatorConfigSchema } from "@taserjs/router-generator";
import { z } from "zod";

const schemaPath = join(dirname(fileURLToPath(import.meta.url)), "..", "taser.config.schema.json");

describe("taser.config.schema.json", () => {
  it("matches generatorConfigSchema output", () => {
    const expected = z.toJSONSchema(generatorConfigSchema, {
      target: "draft-2020-12",
      io: "output",
      reused: "inline",
      unrepresentable: "any",
    });

    const onDisk = JSON.parse(readFileSync(schemaPath, "utf8"));

    expect(onDisk.type).toBe("object");
    expect(onDisk.additionalProperties).toBe(false);
    expect(onDisk.properties).toEqual(expected.properties);
    expect(onDisk.required).toEqual(expected.required);
  });
});
