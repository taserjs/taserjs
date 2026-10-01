import type { Metadata } from "next";

import { homeMetadata } from "./metadata";
import { pageImageRoute } from "./shared";

export const source: Record<string, Metadata["openGraph"]> = {
  home: homeMetadata.openGraph,
};

export function getPageImageUrl(slug: string) {
  const segments = [slug, "image.webp"];

  return {
    segments,
    url: "/" + [...pageImageRoute.split("/"), ...segments].filter(Boolean).join("/"),
  };
}
