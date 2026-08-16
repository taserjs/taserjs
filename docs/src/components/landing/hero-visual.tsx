import { HeroCode } from "./hero-code";
import heroGlow from "@/assets/hero-glow.svg";

export function HeroVisual() {
  return (
    <div className="relative min-w-0 w-full landing-animate-in landing-delay-3">
      <img
        src={heroGlow.url}
        alt=""
        aria-hidden
        className="pointer-events-none absolute -inset-12 landing-glow opacity-80 dark:opacity-100"
      />
      <div className="landing-float relative min-w-0 w-full">
        <HeroCode />
        <div className="absolute -right-3 -bottom-3 rounded-lg border border-fd-border bg-fd-background px-3 py-1.5 text-xs font-medium shadow-md md:-right-4 md:-bottom-4">
          <span className="landing-text-gradient-cool">E2E Type Safe</span>
        </div>
      </div>
    </div>
  );
}
