import type { AnalysisCache, ExtensionOption, TaserOptions } from "@taserjs/router-generator";

/** Options for taserNitro() module / taser config block in nitro.config.ts */
export type TaserNitroOptions = {
  entry?: string | undefined;
  extension?: ExtensionOption | undefined;
  quotes?: "single" | "double" | undefined;
  semi?: boolean | undefined;
  header?: string[] | undefined;
  format?: boolean | undefined;
  validate?: boolean | undefined;
  basePath?: string | undefined;
};

/** Options for standalone Vite plugin taser() */
export type TaserPluginOptions = TaserNitroOptions & {
  rootDir?: string | undefined;
  routesDir?: string | undefined;
  ignore?: string[] | undefined;
  /**
   * Built-in serving (srvx adapter): dev server + production serve shim.
   * Requires srvx to be installed in the app. Enabled by default;
   * set false when only the virtual modules / route watching are wanted.
   */
  server?: boolean | undefined;
  /** Dev/prod listen port when server is enabled. Defaults to PORT env or 3000. */
  port?: number | undefined;
};

export type TaserVirtualContext = {
  rootDir: string;
  routesDir: string;
  ignore: readonly string[];
  options: TaserOptions;
  /** Shared stat-keyed parse cache; survives invalidations so unchanged files are never re-parsed. */
  analysisCache: AnalysisCache;
  getManifestCode: () => Promise<string>;
  getEntryCode: () => Promise<string>;
  invalidate: () => void;
  writeTypes: () => Promise<boolean>;
};
