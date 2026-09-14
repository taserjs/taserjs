export interface BootBinding {
  key: string;
  importPath: string;
  factoryName: string;
}

export interface AddonDefinition {
  id: string;
  category: "database" | "logger" | "validator";
  dependencies(ctx: import("../core/types.js").ScaffoldContext): string[];
  devDependencies(ctx: import("../core/types.js").ScaffoldContext): string[];
  scripts?(ctx: import("../core/types.js").ScaffoldContext): Record<string, string>;
  bootBinding?(ctx: import("../core/types.js").ScaffoldContext): BootBinding | undefined;
  apply(
    ctx: import("../core/types.js").ScaffoldContext,
    write: (path: string, content: string) => Promise<void> | void,
  ): Promise<void>;
}
