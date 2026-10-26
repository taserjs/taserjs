import type { HostId } from "../core/types.js";

export type HostRuntime = "node" | "fetch";

export interface HostDefinition {
  id: Exclude<HostId, "none">;
  label: string;
  /** Node hosts are written to `server.node.ts`, fetch hosts to `server.ts`; Taser.js detects them by name. */
  runtime: HostRuntime;
  dependencies: string[];
  devDependencies: string[];
  /** Contents of the host entry; its default export is what Taser.js falls through to. */
  template: string;
}

export const HOST_FILE_NAMES: Record<HostRuntime, string> = {
  node: "server.node.ts",
  fetch: "server.ts",
};
