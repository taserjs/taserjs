import { existsSync } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "takumi-js/response";
import { OpenGraphTemplate, OpenGraphTemplateProps } from "@/components/og";

export type OpenGraphImageProps = Omit<OpenGraphTemplateProps, "assets">;

function getAssetsDir() {
  const cwd = process.cwd();
  if (existsSync(path.join(cwd, "src/assets"))) {
    return path.join(cwd, "src/assets");
  }
  return path.join(cwd, "docs/src/assets");
}

let cachedAssets: Promise<{
  assets: { heroGlow: string; logo: string };
  ogCss: string;
  fontBuffer: Buffer;
}> | null = null;

function loadAssets() {
  if (!cachedAssets) {
    const assetsDir = getAssetsDir();
    cachedAssets = Promise.all([
      fs.readFile(path.join(assetsDir, "hero-glow.svg"), "base64"),
      fs.readFile(path.join(assetsDir, "logo.svg"), "base64"),
      fs.readFile(path.join(assetsDir, "og.css"), "utf-8"),
      fs.readFile(path.join(assetsDir, "fonts/JetBrainsMono-Bold.ttf")),
    ]).then(([heroGlow, logo, ogCss, fontBuffer]) => ({
      assets: { heroGlow, logo },
      ogCss,
      fontBuffer,
    }));
  }
  return cachedAssets;
}

export async function OpenGraphImage({ title, description }: OpenGraphImageProps) {
  const { assets, ogCss, fontBuffer } = await loadAssets();

  return new ImageResponse(
    <OpenGraphTemplate title={title} description={description} assets={assets} />,
    {
      width: 1200,
      height: 630,
      format: "webp",
      stylesheets: [ogCss],
      fonts: [
        {
          name: "JetBrains Mono",
          data: fontBuffer,
          weight: 700,
          style: "normal" as const,
        },
      ],
    },
  );
}
