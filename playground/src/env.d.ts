declare module "*?worker" {
  const WorkerFactory: { new (): Worker };
  export default WorkerFactory;
}

/** Vite HMR handle (only the API the entry uses). */
interface ImportMeta {
  readonly hot?: { readonly decline: () => void };
}

declare module "virtual:taser-dts" {
  const dts: Record<string, string>;
  export default dts;
}

declare module "esbuild-wasm/esbuild.wasm?url" {
  const url: string;
  export default url;
}
