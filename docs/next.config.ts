import type { NextConfig } from "next";
import { createMDX } from "fumadocs-mdx/next";

const withMDX = createMDX();

const nextConfig: NextConfig = {
  serverExternalPackages: ["@takumi-rs/core", "@takumi-rs/wasm"],
  reactStrictMode: true,
  async redirects() {
    return [
      {
        source: "/motivation",
        destination: "/#motivation",
        permanent: false,
      },
      {
        source: "/sponsor",
        destination: "/#sponsors",
        permanent: false,
      },
    ];
  },
};

export default withMDX(nextConfig);

import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
void initOpenNextCloudflareForDev();
