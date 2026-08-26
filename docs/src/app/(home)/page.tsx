import { AdaptersSection } from "@/components/landing/adapters-section";
import { AuthorSection } from "@/components/landing/author-section";
import { CtaSection } from "@/components/landing/cta-section";
import { HeroSection } from "@/components/landing/hero-section";
import { MotivationSection } from "@/components/landing/motivation-section";
import { ProblemSolutionTabs } from "@/components/landing/problem-solution-tabs";
import { RoadmapSection } from "@/components/landing/roadmap-section";
import { SponsorsSection } from "@/components/landing/sponsors-section";
import { TryItSection } from "@/components/landing/try-it-section";
import { homeMetadata } from "@/lib/metadata";
import { SoftwareApplicationJsonLd, WebSiteJsonLd } from "@/components/json-ld";

export const metadata = homeMetadata;

export default function HomePage() {
  return (
    <>
      <SoftwareApplicationJsonLd />
      <WebSiteJsonLd />
      <HeroSection />
      <ProblemSolutionTabs />
      <MotivationSection />
      <TryItSection />
      <AdaptersSection />
      <RoadmapSection />
      <SponsorsSection />
      <CtaSection />
      <AuthorSection />
    </>
  );
}
