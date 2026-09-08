export type HttpMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";

export interface TaserRequest {
  params: Record<string, string>;
  query: Record<string, string | string[]>;
  headers: Headers;
  method: string;
  url: string;
  raw: Request;
}

export interface RouteHandlerArgs {
  req: TaserRequest;
  ctx: Record<string, unknown>;
  state: Record<string, unknown>;
}

export type RouteHandler = (args: RouteHandlerArgs) => Response | Promise<Response>;

export interface RouteDefinition<TPath extends string = string> {
  readonly kind: "route";
  readonly method: HttpMethod;
  readonly path: TPath;
  readonly handler: RouteHandler;
}
