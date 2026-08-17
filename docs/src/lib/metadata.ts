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
    "Scaffold a typed API in seconds, add your first route, and let watch-mode codegen generate the manifest. Mount on Express, Hono, Fastify, or Node.",
  "routing/file-based":
    "HTTP verb files (.get.ts, .post.ts) define your endpoints. Learn URL mappings, parameters, splats, and automated manifest codegen.",
  "routing/layouts-and-middleware":
    "Scale API composition without losing types. Define scoped directory middleware and let typed context flow to every child handler automatically.",
  validation:
    "Types that match real runtime behavior. Validate params, query, headers, and body with any Standard Schema library (Zod, ArkType, Valibot).",
  "responses-and-errors":
    "Enforce exact response schemas with .returns(). Catch payload drift at compile time and centralize typed error replies with reply.* helpers.",
  adapters:
    "Write once, run anywhere. Mount the exact same router on Express, Hono, Fastify, or plain Node without changing handler logic.",
  "typed-client":
    "Auto-generated API client with complete type safety. Route paths, parameters, query, body, and return shapes stay permanently in sync.",
};

export const docsImageAlts: Record<string, string> = {
  "": "Taser Docs: Introduction to Type-Safe REST API Routing",
  "getting-started": "Taser Docs: Getting Started with Type-Safe API Routing",
  "routing/file-based": "Taser Docs: File-Based Routing for REST APIs",
  "routing/layouts-and-middleware": "Taser Docs: Cascading Middleware and Directory Layouts",
  validation: "Taser Docs: Standard Schema Runtime Validation",
  "responses-and-errors": "Taser Docs: Compile-Time Return Contracts and Error Replies",
  adapters: "Taser Docs: Runtime Adapters for Express, Hono, Fastify, and Node",
  "typed-client": "Taser Docs: End-to-End Typed API Client",
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
