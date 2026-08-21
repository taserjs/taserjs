export type SwaggerUiOptions = {
  title?: string;
  specUrl?: string;
  spec?: Record<string, unknown>;
  persistAuthorization?: boolean;
  deepLinking?: boolean;
  displayOperationId?: boolean;
  filter?: boolean | string;
  customCss?: string;
};

/**
 * Renders an interactive Swagger UI HTML page.
 */
export function renderSwaggerUi(options: SwaggerUiOptions = {}): string {
  const title = options.title ?? "Swagger UI";
  const persistAuth = options.persistAuthorization ?? true;
  const deepLinking = options.deepLinking ?? true;
  const displayOperationId = options.displayOperationId ?? false;
  const filter = options.filter ?? true;

  const specInit = options.spec
    ? `spec: ${JSON.stringify(options.spec)},`
    : options.specUrl
      ? `url: "${options.specUrl}",`
      : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title}</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui.css" />
  <style>
    html { box-sizing: border-box; overflow: -moz-scrollbars-vertical; overflow-y: scroll; }
    *, *:before, *:after { box-sizing: inherit; }
    body { margin: 0; background: #fafafa; }
    ${options.customCss ?? ""}
  </style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-standalone-preset.js"></script>
  <script>
    window.onload = function() {
      window.ui = SwaggerUIBundle({
        ${specInit}
        dom_id: '#swagger-ui',
        deepLinking: ${deepLinking},
        persistAuthorization: ${persistAuth},
        displayOperationId: ${displayOperationId},
        filter: ${typeof filter === "string" ? `"${filter}"` : filter},
        presets: [
          SwaggerUIBundle.presets.apis,
          SwaggerUIStandalonePreset
        ],
        layout: "StandaloneLayout"
      });
    };
  </script>
</body>
</html>`;
}
