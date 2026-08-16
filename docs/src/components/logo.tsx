import { cn } from "@/lib/cn";

type LogoProps = {
  className?: string;
};

export function Logo({ className }: LogoProps) {
  return <span role="img" aria-label="Taser" className={cn("landing-logo", className ?? "h-7")} />;
}
