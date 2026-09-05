import type { Metadata } from "next";

export const siteConfig = {
  name: "Taser.js",
  url: "https://taserjs.dev",
  locale: "en_US",
  twitterSite: "@taserjs",
  twitterCreator: "@KaziAhmedDev",
} as const;

const OG_IMAGE_WIDTH = 1200;
const OG_IMAGE_HEIGHT = 630;

export const defaultOgImage = {
  url: "/og/pages/home/image.webp",
  alt: "Taser.js: Type-Safe File-Based Routing for REST APIs",
  width: OG_IMAGE_WIDTH,
  height: OG_IMAGE_HEIGHT,
  type: "image/webp",
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
  const fullImageUrl = opts.image.startsWith("http")
    ? opts.image
    : new URL(opts.image, siteConfig.url).toString();

  const image = {
    url: fullImageUrl,
    width: OG_IMAGE_WIDTH,
    height: OG_IMAGE_HEIGHT,
    alt: opts.imageAlt,
    type: "image/webp",
  };

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
      images: [image],
    },
    twitter: {
      card: "summary_large_image",
      site: siteConfig.twitterSite,
      creator: siteConfig.twitterCreator,
      title: ogTitle,
      description: ogDescription,
      images: [image],
    },
  };
}

export const homeMetadata = createPageMetadata({
  title: "Taser.js: Type-Safe File-Based Routing for REST APIs",
  description:
    "File-based routing for TypeScript REST APIs. Compose scoped directory middleware with full type inference, enforce compile-time return contracts, and eliminate type assertions forever.",
  openGraphDescription:
    "Define schemas once. Let types cascade through directory middleware, handlers, compile-time return checks, and your typed client with zero type casting.",
  path: "/",
  image: "/og/pages/home/image.webp",
  imageAlt: "Taser.js: Type-Safe File-Based Routing for REST APIs",
});

export const docsOpenGraphDescriptions: Record<string, string> = {
  "": "Type-safe file-based routing for REST APIs. Quick start, routing guides, Standard Schema validation, runtime adapters, and auto-generated typed clients.",
  "getting-started":
    "Scaffold a production-ready typed API in seconds using create-taserjs with zero-config TypeScript, watch mode, and database presets.",
  "getting-started/manual-installation":
    "Step-by-step guide to installing and configuring Taser.js with Vite, Next.js, Nitro, and host pass-through dispatching (Web Standard, Express, Fastify).",
  "getting-started/core-concepts":
    "Master Taser.js architecture: four pillars, request lifecycle sequence, context injection, and compiler-enforced return contracts.",
  "getting-started/migration":
    "Incrementally migrate existing Express or Fastify APIs to Taser.js with zero downtime using the host pass-through architecture.",
  "plugins/vite":
    "Integrate Taser.js into Vite with virtual route modules, ambient type generation, instant HMR, and standalone deployment.",
  "plugins/next":
    "Configure the @taserjs/router-plugin/next bundler plugin for Next.js App Router compilation, options, and disk artifacts.",
  "plugins/nitro":
    "Deploy Taser.js across edge, serverless, and multi-cloud runtimes using the @taserjs/router-plugin/nitro module.",
  "plugins/bundlers":
    "Use Taser.js with Webpack, Rspack, Rollup, Rolldown, or Esbuild via @taserjs/router-plugin subpath exports.",
  "fullstack/tanstack-start":
    "Build fullstack React applications with TanStack Start and Taser.js. Type-safe data fetching in TanStack Router loaders and React Query.",
  "fullstack/nextjs":
    "Build fullstack Next.js 15+ App Router applications with a dedicated Taser.js REST API subsystem. Type-safe data fetching in RSC, Server Actions, and client hooks.",
  "frameworks/standalone":
    "Build standalone, zero-host HTTP APIs with pure Taser.js, Vite, and Nitro. Maximum throughput with web standards.",
  "frameworks/fetch-native":
    "Run Taser.js alongside any Web Standard or Fetch-native host framework (Hono, Elysia, HatTip, or Web Fetch) using host pass-through.",
  "frameworks/express":
    "Add Taser.js file-based routing to an Express application with seamless host pass-through dispatching.",
  "frameworks/fastify":
    "Pair Taser.js file routing with Fastify plugins and hooks using the host pass-through architecture.",
  "routing/file-conventions":
    "HTTP method suffixes, index routes, dynamic parameters ($id), splat catch-alls ($), and pathless layouts explained.",
  "routing/defining-routes":
    "Create GET, POST, PUT, PATCH, DELETE routes with fluent chaining, query, param, and body validation schemas.",
  "routing/layouts-and-middleware":
    "Scale API composition without losing types. Define scoped directory middleware and cascade typed state down folder trees.",
  "routing/refactoring-handlers":
    "Extract reusable route handlers and split route definitions into clean, modular units with zero type loss.",
  "routing/context-and-state":
    "Manage boot singletons and request-scoped metadata with createContext. Access standard Web Request objects and define typed application context.",
  "validation/standard-schema":
    "Validate query parameters, path params, request bodies, and file uploads using Zod, ArkType, Valibot, or any Standard Schema library.",
  "validation/middleware-validation":
    "Validate headers, auth tokens, and session context at the layout level before requests reach route handlers.",
  "validation/handling-errors":
    "Catch validation failures, extract detailed field issues, and format customized 422 Unprocessable Entity error payloads.",
  "responses/reply-helpers":
    "Send clean, status-discriminated HTTP responses with tree-shakeable json(), ok(), notFound(), and redirect().",
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
  deployments:
    "Deploy Taser.js APIs to Cloudflare Workers, Vercel, AWS Lambda, Node.js, Bun, Deno, and Netlify using Nitro presets.",
  client:
    "Auto-completing, end-to-end typed proxy client generated from your server router type with zero runtime drift.",
  cli: "Generate ambient TypeScript definitions and scaffold empty route files with @taserjs/router-cli.",
  "api-reference/router":
    "Complete API reference for @taserjs/router: createTaserApp, createContext, TaserRouter, RouteBuilder, and reply helpers.",
  "api-reference/router-plugin":
    "Complete API reference for @taserjs/router-plugin: Vite, Next.js, and Nitro compiler plugin options.",
  "api-reference/router-client":
    "Complete API reference for @taserjs/router-client: createClient, formBody, ClientRequestOptions, and utility types.",
  "api-reference/router-cli":
    "Complete command options and flag reference for @taserjs/router-cli.",
};

export const docsImageAlts: Record<string, string> = {
  "": "Taser.js Docs: Introduction to Type-Safe REST API Routing",
  "getting-started": "Taser.js Docs: Getting Started with Type-Safe API Routing",
  "getting-started/manual-installation": "Taser.js Docs: Manual Installation Guide",
  "getting-started/core-concepts": "Taser.js Docs: Core Concepts and Architecture",
  "getting-started/migration": "Taser.js Docs: Migration Guide",
  "plugins/vite": "Taser.js Docs: Vite Plugin Integration",
  "plugins/next": "Taser.js Docs: Next.js Plugin Configuration",
  "plugins/nitro": "Taser.js Docs: Nitro Server Engine Module",
  "plugins/bundlers": "Taser.js Docs: Bundler Adapters",
  "fullstack/tanstack-start": "Taser.js Docs: TanStack Start Fullstack Integration",
  "fullstack/nextjs": "Taser.js Docs: Next.js App Router Fullstack Integration",
  "frameworks/standalone": "Taser.js Docs: Standalone API Architecture",
  "frameworks/fetch-native": "Taser.js Docs: Web Standard & Fetch Frameworks Host Pass-Through",
  "frameworks/express": "Taser.js Docs: Express Host Pass-Through",
  "frameworks/fastify": "Taser.js Docs: Fastify Host Pass-Through",
  "routing/file-conventions": "Taser.js Docs: File Conventions and Routing Rules",
  "routing/defining-routes": "Taser.js Docs: Defining Routes and Schemas",
  "routing/layouts-and-middleware": "Taser.js Docs: Cascading Layouts and Middleware",
  "routing/refactoring-handlers": "Taser.js Docs: Refactoring Route Handlers",
  "routing/context-and-state": "Taser.js Docs: Application Context and State",
  "validation/standard-schema": "Taser.js Docs: Standard Schema Runtime Validation",
  "validation/middleware-validation": "Taser.js Docs: Middleware and Header Validation",
  "validation/handling-errors": "Taser.js Docs: Validation Error Handling",
  "responses/reply-helpers": "Taser.js Docs: Status Reply Helpers",
  "responses/cookies": "Taser.js Docs: Cookie and Signed Cookie Management",
  "responses/response-contracts": "Taser.js Docs: Compile-Time Response Contracts",
  "responses/streaming-and-files": "Taser.js Docs: Streaming and File Responses",
  "responses/error-handling": "Taser.js Docs: Global Error Handling",
  "middleware/cors": "Taser.js Docs: CORS Middleware Configuration",
  "middleware/jwt-and-jwk": "Taser.js Docs: JWT and JWKS Authentication",
  "middleware/security-and-utilities": "Taser.js Docs: Security Headers and Utilities",
  deployments: "Taser.js Docs: Nitro Deployment Presets",
  client: "Taser.js Docs: Typed Client SDK",
  cli: "Taser.js Docs: CLI Tooling and Codegen",
  "api-reference/router": "Taser.js Docs: @taserjs/router API Reference",
  "api-reference/router-plugin": "Taser.js Docs: @taserjs/router-plugin API Reference",
  "api-reference/router-client": "Taser.js Docs: @taserjs/router-client API Reference",
  "api-reference/router-cli": "Taser.js Docs: @taserjs/router-cli API Reference",
};

export function createDocsPageMetadata(opts: {
  title: string;
  description: string;
  slugKey: string;
  image: string;
}): Metadata {
  const pageTitle = `${opts.title} | Taser.js Docs`;
  const path = opts.slugKey ? `/docs/${opts.slugKey}` : "/docs";
  const ogDesc = docsOpenGraphDescriptions[opts.slugKey] || opts.description;
  const imgAlt = docsImageAlts[opts.slugKey] || `Taser.js Docs: ${opts.title}`;

  return createPageMetadata({
    title: pageTitle,
    description: opts.description,
    openGraphTitle: pageTitle,
    openGraphDescription: ogDesc,
    path,
    image: opts.image,
    imageAlt: imgAlt,
  });
}

export const rootMetadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  applicationName: siteConfig.name,
  icons: {
    icon: [
      {
        url: "/favicon.ico",
        sizes: "32x32",
      },
      {
        url: "/favicon.svg",
        type: "image/svg+xml",
      },
      {
        url: "/favicon-16x16.png",
        sizes: "16x16",
        type: "image/png",
      },
      {
        url: "/favicon-32x32.png",
        sizes: "32x32",
        type: "image/png",
      },
    ],
    apple: [
      {
        url: "/apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  },
  manifest: "/site.webmanifest",
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
    site: siteConfig.twitterSite,
    creator: siteConfig.twitterCreator,
    images: [defaultOgImage],
  },
};
