import type { RouteFileMethod } from "../types/http.js";
import { createRouteFactoryName } from "../scan/parse-route-source.js";

export function routeImports(entry: string): string {
  return `import { json } from '@taserjs/router/reply'
import { t } from '${entry}'
`;
}

export function routeBuilderConstName(method: RouteFileMethod): string {
  return method;
}

export function routeBuilderCall(method: RouteFileMethod, urlPath: string): string {
  const factoryName = createRouteFactoryName(method);
  if (method === "ANY") {
    return `${factoryName}('${urlPath}', ['GET'])`;
  }
  return `${factoryName}('${urlPath}')`;
}

export function routeBuilderLine(method: RouteFileMethod, urlPath: string): string {
  const constName = routeBuilderConstName(method);
  return `const ${constName} = ${routeBuilderCall(method, urlPath)}`;
}

export function routeContextExport(builderName: string): string {
  return `export type RouteContext = typeof ${builderName}.$Infer.Context`;
}

export function routeHandlerExport(builderName: string): string {
  return `export const Route = ${builderName}.handler((_ctx) => {
  return json({ ok: true })
})`;
}

export function routeScaffoldSource(
  urlPath: string,
  method: RouteFileMethod,
  entry: string,
): string {
  const builderName = routeBuilderConstName(method);
  return `${routeImports(entry)}
${routeBuilderLine(method, urlPath)}

${routeContextExport(builderName)}
${routeHandlerExport(builderName)}
`;
}

export function layoutScaffoldSource(layoutId: string, entry: string): string {
  const mountPath = layoutId === "/$" ? "/$" : layoutId;
  return `import { t } from '${entry}'

export const Middleware = t.middleware('${mountPath}').use({
  handler: (_ctx, next) => next(),
})
`;
}
