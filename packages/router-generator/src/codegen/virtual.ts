import { DEFAULT_MANIFEST_HEADER, VIRTUAL_ENTRY_ID, VIRTUAL_MANIFEST_ID } from "../constants.js";
import { joinManifestSections } from "./manifest.js";

export type EmitVirtualDeclarationsOptions = {
  header?: readonly string[] | undefined;
};

export function emitVirtualDeclarationsSource(
  options: EmitVirtualDeclarationsOptions = {},
): string {
  const code = `import type { RouteManifest } from "./routes.js";

declare module "${VIRTUAL_MANIFEST_ID}" {
  export const routeManifest: RouteManifest;
  export default routeManifest;
  export type { RouteManifest };
}

declare module "${VIRTUAL_ENTRY_ID}" {
  import type { TaserApp } from "@taserjs/router";
  export const app: TaserApp<RouteManifest>;
  export default app;
}
`;

  return joinManifestSections(options.header ?? DEFAULT_MANIFEST_HEADER, code);
}
