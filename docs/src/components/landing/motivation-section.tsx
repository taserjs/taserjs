import { RouterComparison } from "./router-comparison";
import { SectionAccent, SectionHeader } from "./section-header";
import { SectionSeparator } from "./section-separator";

export function MotivationSection() {
  return (
    <section id="motivation" className="relative scroll-mt-14">
      <SectionSeparator />
      <div className="mx-auto max-w-(--fd-layout-width) px-6 py-16 md:py-24">
        <SectionHeader
          align="center"
          className="mb-10"
          eyebrow="Mental Model"
          title={
            <>
              Inspired by <SectionAccent>TanStack Router</SectionAccent>. Engineered for REST APIs.
            </>
          }
          description="TanStack Router revolutionized client routing with file-system layouts and type inference. Taser.js brings that same intuition to backend HTTP servers: HTTP verb files for handlers, non-verb files for cascading directory middleware."
        />

        {/* Side-by-Side IDE Window Comparison */}
        <RouterComparison />
      </div>
    </section>
  );
}
