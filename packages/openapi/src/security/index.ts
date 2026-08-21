import type { OpenApiSecurityRequirement, OpenApiSecurityScheme } from "../types.js";

export type DetectedSecurity = {
  schemes: Record<string, OpenApiSecurityScheme>;
  requirements: OpenApiSecurityRequirement[];
};

/**
 * Inspects route and layout middlewares to detect security schemes like JWT, JWK, Bearer, Basic, API Key.
 */
export function detectMiddlewaresSecurity(
  middlewares: readonly unknown[] = [],
): DetectedSecurity {
  const schemes: Record<string, OpenApiSecurityScheme> = {};
  const requirements: OpenApiSecurityRequirement[] = [];

  for (const mw of middlewares) {
    if (!mw || typeof mw !== "object") continue;

    const name = (mw as any).name ?? (mw as any).middlewareName ?? "";

    if (name === "jwt" || name === "jwk" || name.includes("jwt") || name.includes("jwk")) {
      schemes.bearerAuth = {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        description: "JSON Web Token authentication",
      };
      if (!requirements.some((r) => "bearerAuth" in r)) {
        requirements.push({ bearerAuth: [] });
      }
    } else if (name === "bearerAuth" || name === "bearer") {
      schemes.bearerAuth = {
        type: "http",
        scheme: "bearer",
        description: "Bearer authentication",
      };
      if (!requirements.some((r) => "bearerAuth" in r)) {
        requirements.push({ bearerAuth: [] });
      }
    } else if (name === "basicAuth" || name === "basic") {
      schemes.basicAuth = {
        type: "http",
        scheme: "basic",
        description: "HTTP Basic authentication",
      };
      if (!requirements.some((r) => "basicAuth" in r)) {
        requirements.push({ basicAuth: [] });
      }
    } else if (name === "apiKey" || name === "apiKeyAuth") {
      const headerName = (mw as any).headerName ?? "X-API-Key";
      schemes.apiKeyAuth = {
        type: "apiKey",
        in: "header",
        name: headerName,
        description: "API Key authentication",
      };
      if (!requirements.some((r) => "apiKeyAuth" in r)) {
        requirements.push({ apiKeyAuth: [] });
      }
    }
  }

  return { schemes, requirements };
}
