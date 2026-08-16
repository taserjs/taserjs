import { AdaptersSection } from "@/components/landing/adapters-section";
import { CtaSection } from "@/components/landing/cta-section";
import { FeaturesSection } from "@/components/landing/features-section";
import { HeroSection } from "@/components/landing/hero-section";
import { SponsorsSection } from "@/components/landing/sponsors-section";
import { TryItSection } from "@/components/landing/try-it-section";
import { homeMetadata } from "@/lib/metadata";

export const metadata = homeMetadata;

export default function HomePage() {
  return (
    <>
      <HeroSection />
      <TryItSection />
      <FeaturesSection />
      {/* <TestimonialsSection /> */}
      <AdaptersSection />
      <SponsorsSection />
      <CtaSection />
    </>
  );
}
