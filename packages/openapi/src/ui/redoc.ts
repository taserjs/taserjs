export type RedocUiOptions = {
  title?: string;
  specUrl?: string;
  spec?: Record<string, unknown>;
  theme?: Record<string, unknown>;
};

/**
 * Renders an interactive Redoc documentation HTML page.
 */
export function renderRedocUi(options: RedocUiOptions = {}): string {
  const title = options.title ?? "ReDoc";
  const specInit = options.spec
    ? `Redoc.init(${JSON.stringify(options.spec)}, ${JSON.stringify(options.theme ?? {})}, document.getElementById('redoc-container'))`
    : `Redoc.init("${options.specUrl ?? ""}", ${JSON.stringify(options.theme ?? {})}, document.getElementById('redoc-container'))`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title}</title>
  <link href="https://fonts.googleapis.com/css?family=Montserrat:300,400,700|Roboto:300,400,700" rel="stylesheet">
  <style>
    body { margin: 0; padding: 0; }
  </style>
</head>
<body>
  <div id="redoc-container"></div>
  <script src="https://cdn.jsdelivr.net/npm/redoc@latest/bundles/redoc.standalone.js"></script>
  <script>
    ${specInit};
  </script>
</body>
</html>`;
}
