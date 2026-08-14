import type { NextConfig } from 'next'
import { createMDX } from 'fumadocs-mdx/next'

const withMDX = createMDX()

const nextConfig: NextConfig = {
  serverExternalPackages: ['@takumi-rs/core', '@takumi-rs/wasm'],
  reactStrictMode: true,
}

export default withMDX(nextConfig)

import { initOpenNextCloudflareForDev } from '@opennextjs/cloudflare'
void initOpenNextCloudflareForDev()
