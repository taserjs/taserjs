import type { NextConfig } from "next";
import { createTaser } from "@taserjs/plugin/next";

const nextConfig: NextConfig = {
  reactCompiler: true,
};

const withTaser = createTaser();

export default withTaser(nextConfig);
