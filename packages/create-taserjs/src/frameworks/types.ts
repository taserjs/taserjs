import type { FrameworkGroup, FrameworkId, ResolvedScaffold } from "../core/types.js";

export interface GeneratorCommand {
  /** Package executed through the package manager, for example `create-vite@latest`. */
  pkg: string;
  args: string[];
}

export interface FrameworkTemplate {
  id: string;
  label: string;
}

export interface ConfigPatch {
  /** Config file names the generator may have produced, in order of preference. */
  candidates: string[];
  patch(source: string): string;
  /** Shown to the user when the config is missing or has a shape the codemod cannot edit. */
  manualStep: string;
}

export interface FrameworkLayer {
  /** Project-relative files written on top of the generated project. */
  files: Record<string, string>;
  /** Codemods applied to the generated config files, in order. */
  config?: ConfigPatch | ConfigPatch[];
}

export interface FrameworkDefinition {
  id: FrameworkId;
  label: string;
  group: FrameworkGroup;
  /** Project-relative directory for `taser.ts`, `routes/` and add-on files. */
  serverDir: string;
  /** The framework deploys through its own adapter, so no Nitro preset applies. */
  ownsDeployment: boolean;
  /** The bundler cannot resolve `./file.js` to `./file.ts` (Turbopack), so imports drop the extension. */
  extensionlessImports: boolean;
  /** Adds a `start` script for self-hosted Nitro output when the framework has none of its own. */
  addsStartScript: boolean;
  /** Where the typed client is written; defaults to `src/api.ts`. */
  clientFile?: string;
  /** Base URL the typed client calls; defaults to the relative `/api`. Server-rendered code needs an absolute URL. */
  clientBaseUrl?: string;
  dependencies: string[];
  devDependencies: string[];
  /** Generator templates the user can pick between; the first one is the default. */
  templates?: readonly FrameworkTemplate[];
  /** Absent for API-only projects, which use the built-in skeleton instead of a generator. */
  generator?(context: {
    projectName: string;
    packageManager: string;
    template: string | undefined;
  }): GeneratorCommand;
  layer(scaffold: ResolvedScaffold): FrameworkLayer;
}
