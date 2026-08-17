import type { Metadata } from "next";

export const siteConfig = {
  name: "Taser",
  url: "https://taserjs.dev",
  locale: "en_US",
} as const;

const OG_IMAGE_WIDTH = 1200;
const OG_IMAGE_HEIGHT = 630;

export const defaultOgImage = {
  url: "/og/pages/home/image.webp",
  alt: "Taser: Type-Safe File-Based Routing for REST APIs",
  width: OG_IMAGE_WIDTH,
  height: OG_IMAGE_HEIGHT,
} as const;

export function createPageMetadata(opts: {
  title: string;
  description: string;
  path: string;
  image: string;
  imageAlt: string;
  openGraphTitle?: string;
  openGraphDescription?: string;
}): Metadata {
  const canonical = new URL(opts.path, siteConfig.url).toString();
  const ogTitle = opts.openGraphTitle ?? opts.title;
  const ogDescription = opts.openGraphDescription ?? opts.description;

  const images = [
    {
      url: opts.image,
      width: OG_IMAGE_WIDTH,
      height: OG_IMAGE_HEIGHT,
      alt: opts.imageAlt,
    },
  ];

  return {
    title: opts.title,
    description: opts.description,
    alternates: {
      canonical,
    },
    openGraph: {
      title: ogTitle,
      description: ogDescription,
      url: canonical,
      type: "website",
      siteName: siteConfig.name,
      locale: siteConfig.locale,
      images,
    },
    twitter: {
      card: "summary_large_image",
      title: ogTitle,
      description: ogDescription,
      images: [opts.image],
    },
  };
}

export const homeMetadata = createPageMetadata({
  title: "Taser: Type-Safe File-Based Routing for REST APIs",
  description:
    "File-based routing for TypeScript REST APIs. Compose scoped directory middleware with full type inference, enforce compile-time return contracts, and eliminate type assertions forever.",
  openGraphDescription:
    "Define schemas once. Let types cascade through directory middleware, handlers, compile-time return checks, and your typed client with zero type casting.",
  path: "/",
  image: "/og/pages/home/image.webp",
  imageAlt: "Taser: Type-Safe File-Based Routing for REST APIs",
});

export const docsOpenGraphDescriptions: Record<string, string> = {
  "": "Type-safe file-based routing for REST APIs. Quick start, routing guides, Standard Schema validation, runtime adapters, and auto-generated typed clients.",
  "getting-started":
    "Scaffold a production-ready typed API in seconds using create-taserjs with zero-config TypeScript, watch mode, and database presets.",
  "getting-started/manual-installation":
    "Step-by-step guide to installing and configuring Taser packages in existing Express, Fastify, Hono, or Node.js applications.",
  "getting-started/core-concepts":
    "Master Taser architecture: four pillars, request lifecycle sequence, context injection, and compiler-enforced return contracts.",
  "routing/file-conventions":
    "HTTP method suffixes, index routes, dynamic parameters ($id), splat catch-alls ($), and pathless layouts explained.",
  "routing/defining-routes":
    "Create GET, POST, PUT, PATCH, DELETE routes with query, param, and body validation schemas, and route-level middlewares.",
  "routing/layouts-and-middleware":
    "Scale API composition without losing types. Define scoped directory middleware and cascade typed state down folder trees.",
  "routing/context-and-state":
    "Manage boot singletons and request-scoped metadata with createContext. Understand native adapter interop and reserved keys.",
  "validation/standard-schema":
    "Validate query parameters, path params, request bodies, and file uploads using Zod, ArkType, Valibot, or any Standard Schema library.",
  "validation/middleware-validation":
    "Validate headers, auth tokens, and session context at the layout level before requests reach route handlers.",
  "validation/handling-errors":
    "Catch validation failures, extract detailed field issues, and format customized 422 Unprocessable Entity error payloads.",
  "responses/reply-helpers":
    "Send clean, status-discriminated HTTP responses with reply.json(), reply.ok(), reply.notFound(), and reply.redirect().",
  "responses/cookies":
    "Read, set, sign, and delete HTTP cookies using ctx.cookies. Configure global defaults, HMAC signing, and __Host- / __Secure- prefixes.",
  "responses/response-contracts":
    "Enforce strict compile-time return guarantees with .returns(). Guarantee 100% type safety and eliminate response drift.",
  "responses/streaming-and-files":
    "Stream binary chunks, SSE events, Web ReadableStreams, and disk files safely using stream.pipe() and stream.file().",
  "responses/error-handling":
    "Centralize unhandled exception boundaries and custom 404 handlers using app.onError() and app.notFound().",
  "middleware/cors":
    "Configure Cross-Origin Resource Sharing with the built-in cors() middleware. Support static domains and dynamic origin resolvers.",
  "middleware/jwt-and-jwk":
    "Verify JSON Web Tokens (JWT) and remote JWKS key sets (Clerk, Auth0, Supabase) with typed state injection.",
  "middleware/security-and-utilities":
    "Add security headers, CSRF protection, compression, and request body size limiters using built-in utilities.",
  "adapters/express":
    "Mount your type-safe Taser API seamlessly onto Express apps with the @taserjs/adapter-express adapter.",
  "adapters/fastify":
    "Run Taser on high-performance Fastify servers with the @taserjs/adapter-fastify adapter and native FastifyReply access.",
  "adapters/node-http":
    "Deploy Taser with zero external web framework dependencies using the built-in Node.js HTTP server adapter.",
  "adapters/hono-and-edge":
    "Deploy Taser routes to Cloudflare Workers, Deno, Bun, Fastly, and AWS Lambda using the @taserjs/adapter-hono adapter.",
  client:
    "Auto-completing, end-to-end typed proxy client generated from your server router type with zero runtime drift.",
  cli: "Automate route discovery, manifest compilation, and file scaffolding using @taserjs/router-cli and taser.config.json.",
  "api-reference/router":
    "Complete API reference for @taserjs/router: createTaserApp, createContext, TaserRouter, RouteBuilder, reply, and stream.",
  "api-reference/router-client":
    "Complete API reference for @taserjs/router-client: createClient, formBody, ClientRequestOptions, and utility types.",
  "api-reference/router-cli":
    "Complete CLI command options, flags, and taser.config.json schema reference for @taserjs/router-cli.",
};

export const docsImageAlts: Record<string, string> = {
  "": "Taser Docs: Introduction to Type-Safe REST API Routing",
  "getting-started": "Taser Docs: Getting Started with Type-Safe API Routing",
  "getting-started/manual-installation": "Taser Docs: Manual Installation Guide",
  "getting-started/core-concepts": "Taser Docs: Core Concepts and Architecture",
  "routing/file-conventions": "Taser Docs: File Conventions and Routing Rules",
  "routing/defining-routes": "Taser Docs: Defining Routes and Schemas",
  "routing/layouts-and-middleware": "Taser Docs: Cascading Layouts and Middleware",
  "routing/context-and-state": "Taser Docs: Application Context and State",
  "validation/standard-schema": "Taser Docs: Standard Schema Runtime Validation",
  "validation/middleware-validation": "Taser Docs: Middleware and Header Validation",
  "validation/handling-errors": "Taser Docs: Validation Error Handling",
  "responses/reply-helpers": "Taser Docs: Status Reply Helpers",
  "responses/cookies": "Taser Docs: Cookie and Signed Cookie Management",
  "responses/response-contracts": "Taser Docs: Compile-Time Response Contracts",
  "responses/streaming-and-files": "Taser Docs: Streaming and File Responses",
  "responses/error-handling": "Taser Docs: Global Error Handling",
  "middleware/cors": "Taser Docs: CORS Middleware Configuration",
  "middleware/jwt-and-jwk": "Taser Docs: JWT and JWKS Authentication",
  "middleware/security-and-utilities": "Taser Docs: Security Headers and Utilities",
  "adapters/express": "Taser Docs: Express Server Adapter",
  "adapters/fastify": "Taser Docs: Fastify Server Adapter",
  "adapters/node-http": "Taser Docs: Node HTTP Server Adapter",
  "adapters/hono-and-edge": "Taser Docs: Hono and Edge Runtime Adapters",
  client: "Taser Docs: Typed Client SDK",
  cli: "Taser Docs: CLI Tooling and Codegen",
  "api-reference/router": "Taser Docs: @taserjs/router API Reference",
  "api-reference/router-client": "Taser Docs: @taserjs/router-client API Reference",
  "api-reference/router-cli": "Taser Docs: @taserjs/router-cli API Reference",
};

export function createDocsPageMetadata(opts: {
  title: string;
  description: string;
  slugKey: string;
  image: string;
}): Metadata {
  const pageTitle = `${opts.title} | Taser Docs`;

  return createPageMetadata({
    title: pageTitle,
    description: opts.description,
    openGraphTitle: pageTitle,
    openGraphDescription: docsOpenGraphDescriptions[opts.slugKey] ?? opts.description,
    path: opts.slugKey ? `/docs/${opts.slugKey}` : "/docs",
    image: opts.image,
    imageAlt: docsImageAlts[opts.slugKey] ?? `Taser Docs | ${opts.title}`,
  });
}

export const rootMetadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  applicationName: siteConfig.name,
  icons: {
    icon: [
      {
        url: "/favicon.svg",
        type: "image/svg+xml",
      },
    ],
  },
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    siteName: siteConfig.name,
    locale: siteConfig.locale,
    type: "website",
    images: [defaultOgImage],
  },
  twitter: {
    card: "summary_large_image",
  },
};
