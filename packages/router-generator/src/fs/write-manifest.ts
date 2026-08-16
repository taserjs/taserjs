import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

export type ManifestWriteResult = "written" | "skipped";

export async function writeManifestIfChanged(
  outputFile: string,
  source: string,
  options?: { force?: boolean },
): Promise<ManifestWriteResult> {
  if (!options?.force) {
    try {
      const existing = await readFile(outputFile, "utf8");
      if (existing === source) {
        return "skipped";
      }
    } catch {
      // file does not exist yet
    }
  }

  await mkdir(dirname(outputFile), { recursive: true });
  await writeFile(outputFile, source, "utf8");
  return "written";
}
