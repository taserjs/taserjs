import { existsSync } from "node:fs";

import { mountFetchHost, type HostMountTarget } from "@taserjs/runtime/serve";
import { mountNodeHost } from "@taserjs/runtime/serve/node";
import { join, resolve } from "pathe";

export type HostType = "node" | "fetch";

export interface HostServerInfo {
  type: HostType;
  path: string;
}

const HOST_EXTENSIONS = ["ts", "js", "mjs", "cjs"];

// Node hosts win over fetch hosts when a project defines both.
const HOST_FILE_CANDIDATES: { type: HostType; fileName: string }[] = [
  ...HOST_EXTENSIONS.map((ext) => ({ type: "node" as const, fileName: `server.node.${ext}` })),
  ...HOST_EXTENSIONS.map((ext) => ({ type: "fetch" as const, fileName: `server.${ext}` })),
];

const NODE_HOST_PATH = /\.node(\.|$)/;

/** Finds the user's own server entry that Taser should fall back to for unmatched requests. */
export function detectHostServer(
  serverDir: string,
  cwd: string = process.cwd(),
  explicitEntry?: string,
): HostServerInfo | null {
  if (explicitEntry) {
    const path = resolve(cwd, explicitEntry);
    if (existsSync(path)) return { type: NODE_HOST_PATH.test(path) ? "node" : "fetch", path };
  }

  const found = HOST_FILE_CANDIDATES.find(({ fileName }) => existsSync(join(serverDir, fileName)));
  return found ? { type: found.type, path: join(serverDir, found.fileName) } : null;
}

export function mountHost(app: HostMountTarget, hostModule: unknown, type: HostType): void {
  (type === "node" ? mountNodeHost : mountFetchHost)(app, hostModule);
}
