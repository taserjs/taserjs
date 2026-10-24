import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { deriveCanonicalUrl, deriveLayoutInfo, parseFilePath } from "../src/paths.js";

type CorpusEntry =
  | null
  | { error: string }
  | { verb: string; canonicalPath: string; hierarchySegments: string[] }
  | {
      layout: { layoutId: string; targetSegment: string };
      url: { canonicalPath: string; hierarchySegments: string[] };
    };

const corpus: Record<string, CorpusEntry> = JSON.parse(
  readFileSync(
    join(dirname(fileURLToPath(import.meta.url)), "fixtures/paths-corpus.json"),
    "utf-8",
  ),
);

function derive(file: string): CorpusEntry {
  const parsed = parseFilePath(file);
  if (!parsed) return null;
  try {
    if (parsed.verb) {
      return { verb: parsed.verb, ...deriveCanonicalUrl(parsed.dir, parsed.stem) };
    }
    const { layoutId, targetSegment } = deriveLayoutInfo(parsed.dir, parsed.stem);
    return {
      layout: { layoutId, targetSegment },
      url: deriveCanonicalUrl(parsed.dir, parsed.stem),
    };
  } catch (err) {
    return { error: (err as Error).message };
  }
}

function normalize(entry: CorpusEntry): CorpusEntry {
  if (entry && "layout" in entry) {
    const { layoutId, targetSegment } = entry.layout;
    return { ...entry, layout: { layoutId, targetSegment } };
  }
  return entry;
}

describe("path derivation corpus (frozen from the pre-refactor implementation)", () => {
  it.each(Object.entries(corpus))("%s", (file, expected) => {
    expect(derive(file)).toEqual(normalize(expected));
  });
});
