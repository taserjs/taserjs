import type { ResolvedScaffold } from "../core/types.js";

export interface BootBinding {
  key: string;
  importPath: string;
  factoryName: string;
}

export interface AddonDefinition {
  id: string;
  category: "database" | "logger" | "validator";
  dependencies(ctx: ResolvedScaffold): string[];
  devDependencies(ctx: ResolvedScaffold): string[];
  scripts?(ctx: ResolvedScaffold): Record<string, string>;
  bootBinding?(ctx: ResolvedScaffold): BootBinding | undefined;
  apply(
    ctx: ResolvedScaffold,
    write: (path: string, content: string) => Promise<void> | void,
  ): Promise<void>;
}
