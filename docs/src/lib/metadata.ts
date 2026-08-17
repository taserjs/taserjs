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
  alt: "Taser: Type-safe file-based routing for APIs",
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
  title: "Taser: Type-safe file-based routing for APIs",
  description:
    "File-based routing for Node.js HTTP APIs. Compose layouts and middleware with full TypeScript inference, validate every input, and export a typed client that matches your handlers.",
  openGraphDescription:
    "Define schemas once. Let types flow through layouts, middleware, handlers, and your typed API client. Ship APIs that stay correct as they grow.",
  path: "/",
  image: "/og/pages/home/image.webp",
  imageAlt: "Taser: Type-safe file-based routing for APIs",
});

export const docsOpenGraphDescriptions: Record<string, string> = {
  "": "Type-safe file-based routing for APIs. Quick start, routing guides, validation, adapters, and a typed client that matches your handlers.",
  "getting-started":
    "Scaffold a project, add your first route, and generate the route manifest. Pick Express, Fastify, Hono, or plain Node.",
  "routing/file-based":
    "Route files are the source of truth. Learn naming rules, URL mapping, params, splats, and how codegen keeps the manifest in sync.",
  "routing/layouts-and-middleware":
    "Scale beyond a handful of routes. Define middleware once in layout files and let typed state flow to every handler underneath.",
  validation:
    "Types should describe what your server accepts and returns. Validate inputs at runtime so inference matches real behavior.",
  "responses-and-errors":
    "Use reply.* helpers for consistent responses. Declare return shapes, validate outputs, and centralize error handling in one place.",
  adapters:
    "Taser speaks Request/Response. Mount the same app on Express, Fastify, Node, or any Fetch handler with a single router definition.",
  "typed-client":
    "A client where route names, request inputs, and response types stay in sync with your server. No handwritten API types.",
};

export const docsImageAlts: Record<string, string> = {
  "": "Taser Docs: Introduction to type-safe API routing",
  "getting-started": "Taser Docs: Getting Started with type-safe API routing",
  "routing/file-based": "Taser Docs: File-based routing for Node.js APIs",
  "routing/layouts-and-middleware": "Taser Docs: Layouts and middleware for type-safe APIs",
  validation: "Taser Docs: Runtime validation for type-safe APIs",
  "responses-and-errors": "Taser Docs: Typed responses and error handling",
  adapters: "Taser Docs: Adapters for Express, Fastify, and Node",
  "typed-client": "Taser Docs: Typed client for Taser APIs",
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
