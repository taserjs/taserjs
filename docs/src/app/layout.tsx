import { RootProvider } from "fumadocs-ui/provider/next";
import "./global.css";
import { Inter } from "next/font/google";
import { rootMetadata } from "@/lib/metadata";

const inter = Inter({
  subsets: ["latin"],
});

import favicon from "@/assets/favicon.svg";

export const metadata = rootMetadata;

export default function Layout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={inter.className} suppressHydrationWarning>
      <head>
        <link rel="icon" href={favicon.src} type="image/svg+xml" />
      </head>
      <body className="flex flex-col min-h-screen">
        <RootProvider>{children}</RootProvider>
      </body>
    </html>
  );
}
