import type {
  AnalysisCache,
  GeneratedModel,
  TaserConfig,
  ResolvedTaserConfig,
  FormattingOptions,
  ResolvedFormattingOptions,
  ExtensionOption,
} from "@taserjs/router-generator";

export type {
  GeneratedModel,
  TaserConfig,
  ResolvedTaserConfig,
  FormattingOptions,
  ResolvedFormattingOptions,
  ExtensionOption,
};

export type WatcherOptions = {
  debounceMs?: number | undefined;
  autoScaffold?: boolean | undefined;
};

export type TaserPluginOptions = TaserConfig & {
  server?: boolean | undefined;
  rootDir?: string | undefined;
  watcher?: WatcherOptions | undefined;
};

export type TaserVirtualContext = {
  rootDir: string;
  serverDir: string;
  routesDir: string;
  serverEntryPath?: string | undefined;
  basePath?: string | undefined;
  ignore: readonly string[];
  entry: string;
  formatting: ResolvedFormattingOptions;
  options: ResolvedTaserConfig;
  analysisCache: AnalysisCache;
  writeTypes: () => Promise<boolean>;
  getManifestCode: () => Promise<string>;
  getEntryCode: () => Promise<string>;
  getModel: () => Promise<GeneratedModel>;
  invalidate: () => void;
};
