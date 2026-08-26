import type { MetadataRoute } from "next";
import { source } from "@/lib/source";
import { siteConfig } from "@/lib/metadata";

export const revalidate = 86400; // 24 hours

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = siteConfig.url;

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      url: `${baseUrl}/docs`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
  ];

  const docRoutes: MetadataRoute.Sitemap = source.getPages().map((page) => {
    const slugPath = page.slugs.join("/");
    const url = slugPath ? `${baseUrl}/docs/${slugPath}` : `${baseUrl}/docs`;

    let priority = 0.8;
    if (slugPath.startsWith("getting-started") || slugPath === "") {
      priority = 0.9;
    } else if (
      slugPath.startsWith("routing") ||
      slugPath.startsWith("validation") ||
      slugPath.startsWith("responses") ||
      slugPath.startsWith("frameworks") ||
      slugPath.startsWith("plugins")
    ) {
      priority = 0.85;
    }

    return {
      url,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority,
    };
  });

  const uniqueDocRoutes = docRoutes.filter((r) => r.url !== `${baseUrl}/docs`);

  return [...staticRoutes, ...uniqueDocRoutes];
}
