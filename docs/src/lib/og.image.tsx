import { ImageResponse } from "takumi-js/response";
import { OpenGraphTemplate, OpenGraphTemplateProps } from "@/components/og";
import wasmModule from "takumi-js/wasm";
import {
  heroGlowBase64,
  logoBase64,
  ogCssString,
  jetBrainsMonoBoldBase64,
} from "@/assets/embedded-og-assets";

export type OpenGraphImageProps = Omit<OpenGraphTemplateProps, "assets">;

const fontBuffer = Buffer.from(jetBrainsMonoBoldBase64, "base64");
const assets = {
  heroGlow: heroGlowBase64,
  logo: logoBase64,
};

export async function OpenGraphImage({ title, description }: OpenGraphImageProps) {
  return new ImageResponse(
    <OpenGraphTemplate title={title} description={description} assets={assets} />,
    {
      width: 1200,
      height: 630,
      format: "webp",
      stylesheets: [ogCssString],
      fonts: [
        {
          name: "JetBrains Mono",
          data: fontBuffer,
          weight: 700,
          style: "normal" as const,
        },
      ],
      module: wasmModule,
    },
  );
}
