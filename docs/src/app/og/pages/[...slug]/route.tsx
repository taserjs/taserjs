import { notFound } from "next/navigation";
import { OpenGraphImage } from "@/lib/og.image";
import { source, getPageImageUrl } from "@/lib/pages";

export const revalidate = false;

export async function GET(_req: Request, { params }: RouteContext<"/og/pages/[...slug]">) {
  const { slug } = await params;
  const key = slug.slice(0, -1).join("/");
  const page = source[key];
  if (!page) notFound();

  return OpenGraphImage({
    title: page.title?.toString() ?? "",
    description: page.description ?? "",
  });
}

export function generateStaticParams() {
  return Object.entries(source).map(([slug]) => ({
    slug: getPageImageUrl(slug).segments,
  }));
}
