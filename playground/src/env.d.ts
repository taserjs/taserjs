declare module "*?worker" {
  const WorkerFactory: { new (): Worker };
  export default WorkerFactory;
}

declare module "virtual:taser-dts" {
  const dts: Record<string, string>;
  export default dts;
}

declare module "esbuild-wasm/esbuild.wasm?url" {
  const url: string;
  export default url;
}
