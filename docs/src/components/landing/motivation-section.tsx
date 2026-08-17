import { RouterComparison } from "./router-comparison";
import { SectionAccent, SectionHeader } from "./section-header";
import { SectionSeparator } from "./section-separator";

export function MotivationSection() {
  return (
    <section id="motivation" className="relative bg-fd-muted/20 scroll-mt-14">
      <SectionSeparator />
      <div className="mx-auto max-w-(--fd-layout-width) px-6 py-16 md:py-24">
        <SectionHeader
          align="center"
          className="mb-10"
          eyebrow="Motivation"
          title={
            <>
              Inspired by <SectionAccent>TanStack Router</SectionAccent>
            </>
          }
          description="TanStack Router proved how good route ergonomics can feel on the frontend. Taser brings that exact intuition, directory cascading, and type-safety to backend REST APIs."
        />

        {/* Side-by-Side IDE Window Comparison */}
        <RouterComparison />
      </div>
    </section>
  );
}
