import { createDocsPageMetadata } from "@/lib/metadata";
import { getPageImageUrl, getPageMarkdownUrl, source } from "@/lib/source";
import {
  DocsBody,
  DocsDescription,
  DocsPage,
  DocsTitle,
  MarkdownCopyButton,
  ViewOptionsPopover,
} from "fumadocs-ui/layouts/docs/page";
import { notFound } from "next/navigation";
import { getMDXComponents } from "@/components/mdx";
import { createRelativeLink } from "fumadocs-ui/mdx";
import { gitConfig } from "@/lib/shared";
import { TechArticleJsonLd } from "@/components/json-ld";

export default async function Page(props: PageProps<"/docs/[[...slug]]">) {
  const params = await props.params;
  const page = source.getPage(params.slug);
  if (!page) notFound();

  const MDX = page.data.body;
  const markdownUrl = getPageMarkdownUrl(page).url;
  const slugPath = page.slugs.join("/");

  const breadcrumbs = [
    { name: "Docs", url: "/docs" },
    ...page.slugs.map((slug, idx) => {
      const isLeaf = idx === page.slugs.length - 1;
      const slugSlice = page.slugs.slice(0, idx + 1);
      const intermediatePage = isLeaf ? page : source.getPage(slugSlice);
      const name =
        intermediatePage?.data.title ??
        slug
          .replace(/-/g, " ")
          .replace(/\b\w/g, (char) => char.toUpperCase());

      return {
        name,
        url: `/docs/${slugSlice.join("/")}`,
      };
    }),
  ];

  return (
    <DocsPage toc={page.data.toc} full={page.data.full}>
      <TechArticleJsonLd
        title={page.data.title}
        description={page.data.description ?? ""}
        url={slugPath ? `/docs/${slugPath}` : "/docs"}
        breadcrumbs={breadcrumbs}
      />
      <DocsTitle className="text-3xl sm:text-4xl font-bold tracking-tight text-fd-foreground">
        {page.data.title}
      </DocsTitle>
      <DocsDescription className="mb-0 text-base leading-relaxed text-fd-muted-foreground">
        {page.data.description}
      </DocsDescription>
      <div className="flex flex-row gap-2 items-center border-b border-fd-border/70 pb-6">
        <MarkdownCopyButton markdownUrl={markdownUrl} />
        <ViewOptionsPopover
          markdownUrl={markdownUrl}
          githubUrl={`https://github.com/${gitConfig.user}/${gitConfig.repo}/blob/${gitConfig.branch}/content/docs/${page.path}`}
        />
      </div>
      <DocsBody>
        <MDX
          components={getMDXComponents({
            // this allows you to link to other pages with relative file paths
            a: createRelativeLink(source, page),
          })}
        />
      </DocsBody>
    </DocsPage>
  );
}

export function generateStaticParams() {
  return source.generateParams();
}

export async function generateMetadata(props: PageProps<"/docs/[[...slug]]">) {
  const params = await props.params;
  const page = source.getPage(params.slug);
  if (!page) notFound();

  const slugKey = page.slugs.join("/");

  return createDocsPageMetadata({
    title: page.data.title,
    description: page.data.description ?? "",
    slugKey,
    image: getPageImageUrl(page).url,
  });
}
