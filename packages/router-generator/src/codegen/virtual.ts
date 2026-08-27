import { DEFAULT_MANIFEST_HEADER, VIRTUAL_ENTRY_ID, VIRTUAL_MANIFEST_ID } from "../constants.js";
import { joinManifestSections } from "./manifest.js";

export type EmitVirtualDeclarationsOptions = {
  header?: readonly string[] | undefined;
};

export function emitVirtualDeclarationsSource(
  options: EmitVirtualDeclarationsOptions = {},
): string {
  const code = `declare module "${VIRTUAL_MANIFEST_ID}" {
  export const routeManifest: import("./routes.js").RouteManifest;
  export default routeManifest;
  export type RouteManifest = import("./routes.js").RouteManifest;
}

declare module "${VIRTUAL_ENTRY_ID}" {
  import type { TaserApp } from "@taserjs/router";
  export const app: TaserApp<import("./routes.js").RouteManifest>;
  export default app;
}
`;

  return joinManifestSections(options.header ?? DEFAULT_MANIFEST_HEADER, code);
}
