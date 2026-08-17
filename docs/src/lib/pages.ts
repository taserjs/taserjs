import { homeMetadata } from "./metadata";
import { pageImageRoute } from "./shared";
import type { Metadata } from "next";

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
