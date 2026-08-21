export type ScalarUiOptions = {
  title?: string;
  specUrl?: string;
  spec?: Record<string, unknown>;
};

/**
 * Renders an interactive Scalar API Reference HTML page.
 */
export function renderScalarUi(options: ScalarUiOptions): string {
  const title = options.title ?? "API Reference";
  const specContent = options.spec
    ? `<script id="api-reference" type="application/json">${JSON.stringify(options.spec)}</script>`
    : "";
  const dataUrlAttr = options.specUrl ? `data-url="${options.specUrl}"` : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title}</title>
</head>
<body>
  ${specContent}
  <script
    ${dataUrlAttr}
    src="https://cdn.jsdelivr.net/npm/@scalar/api-reference"
  ></script>
</body>
</html>`;
}
