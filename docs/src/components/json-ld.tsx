import { siteConfig } from "@/lib/metadata";

export interface BreadcrumbItem {
  name: string;
  url: string;
}

export interface TechArticleSchemaProps {
  title: string;
  description: string;
  url: string;
  breadcrumbs: BreadcrumbItem[];
  datePublished?: string;
  dateModified?: string;
}

const authorPerson = {
  "@type": "Person" as const,
  name: "Kazi Ahmed",
  url: "https://github.com/tzsk",
  sameAs: ["https://github.com/tzsk", "https://x.com/KaziAhmedDev"],
};

const publisherOrg = {
  "@type": "Organization" as const,
  name: "Taser.js",
  url: siteConfig.url,
  logo: {
    "@type": "ImageObject" as const,
    url: `${siteConfig.url}/logo.svg`,
  },
};

export function TechArticleJsonLd({
  title,
  description,
  url,
  breadcrumbs,
  datePublished = "2026-01-01",
  dateModified = "2026-08-27T00:00:00.000Z",
}: TechArticleSchemaProps) {
  const fullUrl = url.startsWith("http") ? url : `${siteConfig.url}${url}`;

  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "TechArticle",
    headline: title,
    description: description,
    url: fullUrl,
    inLanguage: "en-US",
    proficiencyLevel: "Intermediate",
    programmingLanguage: "TypeScript",
    author: authorPerson,
    publisher: publisherOrg,
    datePublished,
    dateModified,
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": fullUrl,
    },
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: breadcrumbs.map((crumb, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: crumb.name,
      item: crumb.url.startsWith("http") ? crumb.url : `${siteConfig.url}${crumb.url}`,
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
    </>
  );
}

export function SoftwareApplicationJsonLd() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Taser.js",
    applicationCategory: "DeveloperApplication",
    operatingSystem: "Cross-platform (Node.js, Cloudflare Workers, Vercel, Bun, Deno)",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
    description:
      "Type-safe file-based routing for REST APIs. Cascading middleware context, Standard Schema validation, compile-time return contracts, and zero-drift client generation.",
    softwareVersion: "0.0.14",
    license: "https://opensource.org/licenses/MIT",
    url: siteConfig.url,
    author: authorPerson,
    publisher: publisherOrg,
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

export function WebSiteJsonLd() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Taser.js",
    url: siteConfig.url,
    description: "Type-Safe File-Based Routing for REST APIs",
    publisher: publisherOrg,
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${siteConfig.url}/docs?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
