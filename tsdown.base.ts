import { defineConfig } from "tsdown";

interface PackageBuildOptions {
  entry: string[];
  /** Also emit CommonJS for packages consumed by `require`. */
  cjs?: boolean;
}

// Output files keep plain `.js`/`.d.ts` names for ESM so package.json exports stay readable.
export const definePackageBuild = ({ entry, cjs = false }: PackageBuildOptions) =>
  defineConfig({
    entry,
    format: cjs ? ["esm", "cjs"] : ["esm"],
    dts: true,
    clean: true,
    publint: true,
    outExtensions: ({ format }) =>
      format === "es" ? { js: ".js", dts: ".d.ts" } : { js: ".cjs", dts: ".d.cts" },
  });
