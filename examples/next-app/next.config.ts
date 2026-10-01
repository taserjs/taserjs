import { createTaser } from "@taserjs/plugin/next";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
};

const withTaser = createTaser();

export default withTaser(nextConfig);
