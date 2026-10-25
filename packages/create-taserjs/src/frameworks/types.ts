import type { FrameworkGroup, FrameworkId, ResolvedScaffold } from "../core/types.js";

export interface GeneratorCommand {
  /** Package executed through the package manager, for example `create-vue@latest`. */
  pkg: string;
  args: string[];
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
  config?: ConfigPatch;
}

export interface FrameworkDefinition {
  id: FrameworkId;
  label: string;
  group: FrameworkGroup;
  /** Project-relative directory for `taser.ts`, `routes/` and add-on files. */
  serverDir: string;
  /** The framework deploys through its own adapter, so no Nitro preset applies. */
  ownsDeployment: boolean;
  /** Nitro is needed to serve the built UI next to the API, so `bare` is not allowed. */
  requiresNitro: boolean;
  /** The bundler cannot resolve `./file.js` to `./file.ts` (Turbopack), so imports drop the extension. */
  extensionlessImports: boolean;
  /** Adds a `start` script for self-hosted Nitro output when the framework has none of its own. */
  addsStartScript: boolean;
  dependencies: string[];
  devDependencies: string[];
  /** Absent for API-only projects, which use the built-in skeleton instead of a generator. */
  generator?(context: { projectName: string; packageManager: string }): GeneratorCommand;
  layer(scaffold: ResolvedScaffold): FrameworkLayer;
}
