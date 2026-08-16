import { ImageResponse } from "takumi-js/response";
import { OpenGraphTemplate, OpenGraphTemplateProps } from "@/components/og";
import wasmModule from "takumi-js/wasm";

export type OpenGraphImageProps = Omit<OpenGraphTemplateProps, "assets">;

const links = {
  heroGlow:
    "https://raw.githubusercontent.com/taserjs/taserjs/refs/heads/main/docs/src/assets/hero-glow.svg",
  logo: "https://raw.githubusercontent.com/taserjs/taserjs/refs/heads/main/docs/src/assets/logo.svg",
  css: "https://raw.githubusercontent.com/taserjs/taserjs/refs/heads/main/docs/src/assets/og.css",
};

async function loadAssets() {
  const [heroGlow, logo] = await Promise.all([
    fetch(links.heroGlow).then((res) =>
      res.arrayBuffer().then((b) => Buffer.from(b).toString("base64")),
    ),
    fetch(links.logo).then((res) =>
      res.arrayBuffer().then((b) => Buffer.from(b).toString("base64")),
    ),
  ]);
  return {
    heroGlow,
    logo,
  };
}

async function loadStyles() {
  return fetch(links.css).then((res) => res.text());
}

export async function OpenGraphImage({ title, description }: OpenGraphImageProps) {
  const assets = await loadAssets();
  const styles = await loadStyles();

  return new ImageResponse(
    <OpenGraphTemplate title={title} description={description} assets={assets} />,
    {
      width: 1200,
      height: 630,
      format: "webp",
      stylesheets: [styles],
      module: wasmModule,
    },
  );
}
