import { access } from "node:fs/promises";
import { resolve } from "node:path";

export async function findExistingConfigFiles(
  rootDir: string,
  fileNames: readonly string[],
): Promise<string[]> {
  const checks = await Promise.all(
    fileNames.map(async (fileName) => {
      const fullPath = resolve(rootDir, fileName);
      try {
        await access(fullPath);
        return fullPath;
      } catch {
        return null;
      }
    }),
  );
  return checks.filter((filePath): filePath is string => filePath !== null);
}
