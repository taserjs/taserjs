import type { TaserUserConfig, TaserOptions, AnalysisCache } from "@taserjs/router-generator";
export type { TaserUserConfig, TaserOptions, AnalysisCache };

/**
 * Options accepted by the taser() Nitro module in nitro.config.ts (or programmatic createNitro).
 */
export type TaserNitroOptions = TaserUserConfig;

/**
 * Options accepted by the taser() Vite plugin in vite.config.ts.
 */
export type TaserPluginOptions = TaserUserConfig & {
  /**
   * Built-in serving when running standalone (no nitro() plugin): srvx dev
   * server + production serve shim. Enabled by default; set false to use the
   * plugin for virtual modules / route watching only.
   */
  server?: boolean | undefined;
  /** Standalone dev/prod listen port. Defaults to PORT env or 3000. */
  port?: number | undefined;
};

export type TaserVirtualContext = {
  rootDir: string;
  serverDir: string;
  routesDir: string;
  entryPath: string;
  serverEntryPath?: string | undefined;
  basePath?: string | undefined;
  ignore: readonly string[];
  options: TaserOptions;
  /** Shared stat-keyed parse cache; survives invalidations so unchanged files are never re-parsed. */
  analysisCache: AnalysisCache;
  getManifestCode: () => Promise<string>;
  getEntryCode: () => Promise<string>;
  invalidate: () => void;
  writeTypes: () => Promise<boolean>;
};
