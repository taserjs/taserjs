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
