import type { NextConfig } from 'next'
import { createMDX } from 'fumadocs-mdx/next'

const withMDX = createMDX()

const nextConfig: NextConfig = {
  serverExternalPackages: ['@takumi-rs/core'],
  reactStrictMode: true,
}

import { initOpenNextCloudflareForDev } from '@opennextjs/cloudflare'
void initOpenNextCloudflareForDev()

export default withMDX(nextConfig)
