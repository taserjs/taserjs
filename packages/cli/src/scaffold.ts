export function routeStub(method: string, canonicalPath: string): string {
  const verb = method.toLowerCase();
  const path = JSON.stringify(canonicalPath);
  const call = verb === "any" ? `t.any(${path}, ["GET", "POST"])` : `t.${verb}(${path})`;

  return `import { t } from "@taserjs/router";
import { json } from "@taserjs/router/reply";

export default ${call}.handler(async () => {
  return json({ message: ${JSON.stringify(`Hello from ${canonicalPath}`)} });
});
`;
}

export function layoutStub(layoutId: string): string {
  return `import { t } from "@taserjs/router";

export default t.layout(${JSON.stringify(layoutId)}).use(async ({ req, ctx, state }, next) => {
  return await next();
});
`;
}

export const APP_STUB = `import { defineTaser } from "@taserjs/router";

export default defineTaser();
`;
