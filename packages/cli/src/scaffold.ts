import type { TaserFormattingConfig } from "./config.js";

export interface GenerateRouteStubOptions {
  method: string;
  canonicalPath: string;
  formatting?: TaserFormattingConfig | undefined;
}

export interface GenerateLayoutStubOptions {
  layoutId: string;
  formatting?: TaserFormattingConfig | undefined;
}

export function generateRouteStub({
  method,
  canonicalPath,
  formatting,
}: GenerateRouteStubOptions): string {
  const quote = formatting?.quotes === "single" ? "'" : '"';
  const semi = formatting?.semi === false ? "" : ";";
  const verb = method.toLowerCase();

  const callExpr =
    verb === "any"
      ? `t.any(${quote}${canonicalPath}${quote}, [${quote}GET${quote}, ${quote}POST${quote}])`
      : `t.${verb}(${quote}${canonicalPath}${quote})`;

  return [
    `import { t } from ${quote}@taserjs/router${quote}${semi}`,
    `import { json } from ${quote}@taserjs/router/reply${quote}${semi}`,
    ``,
    `export default ${callExpr}.handler(async () => {`,
    `  return json({ message: ${quote}Hello from ${canonicalPath}${quote} })${semi}`,
    `})${semi}`,
    ``,
  ].join("\n");
}

export function generateLayoutStub({ layoutId, formatting }: GenerateLayoutStubOptions): string {
  const quote = formatting?.quotes === "single" ? "'" : '"';
  const semi = formatting?.semi === false ? "" : ";";

  return [
    `import { t } from ${quote}@taserjs/router${quote}${semi}`,
    ``,
    `export default t.layout(${quote}${layoutId}${quote}).use(async ({ req, ctx, state }, next) => {`,
    `  return await next()${semi}`,
    `})${semi}`,
    ``,
  ].join("\n");
}
