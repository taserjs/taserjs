import type { NextConfig } from "next";
import { createTaser } from "@taserjs/router-plugin/next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
};

const withTaser = createTaser({
  serverDir: 'src/server',
  entry: '@/server/taser',
  basePath: '/api',
})

export default withTaser(nextConfig);
