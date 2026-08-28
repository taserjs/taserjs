/**
 * Your own framework/server entry. Taser composes itself around the
 * default export (any fetch-compatible instance): taser routes first,
 * your framework second, 404 last.
 *
 * The only requirement for `taser dev` / `taser build` is srvx:
 *   pnpm add srvx
 */

const app = {
  async fetch(request: Request) {
    const url = new URL(request.url);

    // A route owned by YOUR framework — taser never touches it.
    if (url.pathname === "/framework") {
      return Response.json({ from: "your-framework" });
    }

    // Unhandled by your framework → fall through (composition returns 404).
    return undefined;
  },
};

export default app;
