export type NitroFetchEvent = {
  req: Request;
  [key: string]: unknown;
};

export type FetchableApp = {
  fetch: (request: Request) => Promise<Response | undefined> | Response | undefined;
};

export function createNitroRouteHandler(app: FetchableApp) {
  return function taserNitroRouteHandler(event: NitroFetchEvent | Request) {
    const request = event instanceof Request ? event : event.req;
    return app.fetch(request);
  };
}
