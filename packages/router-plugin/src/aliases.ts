/**
 * Virtual module ids emitted into generated code instead of absolute filesystem
 * paths. Each host integration (Nitro module / Vite plugin) resolves these to
 * real files so machine paths never leak into artifacts, errors, or sourcemaps.
 */

/** Prefix for route/layout file imports in the virtual manifest. */
export const ROUTES_ALIAS_ID = "#taserjs/routes";

/** The user's taser instance (`taser.ts`) as imported by the virtual entry. */
export const ENTRY_ALIAS_ID = "#taserjs/entry";

/** The optional host server (`server.ts`) as imported by the composed app. */
export const SERVER_ENTRY_ALIAS_ID = "#taserjs/server-entry";
