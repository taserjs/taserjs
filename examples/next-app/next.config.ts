import type { NextConfig } from "next";
import { createTaser } from "@taserjs/plugin/next";

const nextConfig: NextConfig = {
  reactCompiler: true,
};

const withTaser = createTaser({
  serverDir: "src/server",
});

export default withTaser(nextConfig);
