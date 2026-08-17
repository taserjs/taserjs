import type { BaseLayoutProps } from "fumadocs-ui/layouts/shared";
import { gitConfig } from "./shared";
import { Logo } from "@/components/logo";
import { BookOpenIcon, BrainIcon, HeartIcon, MapIcon } from "lucide-react";
import { XIcon } from "@/components/icons/x-icon";
import { DiscordIcon } from "@/components/icons/discord-icon";

export function baseOptions(): BaseLayoutProps {
  return {
    nav: {
      title: (
        <span className="flex items-center gap-2.5 font-semibold">
          <Logo className="h-6" />
        </span>
      ),
      transparentMode: "top",
    },
    links: [
      {
        icon: <BookOpenIcon />,
        text: "Documentation",
        url: "/docs",
        active: "nested-url",
      },
      {
        icon: <BrainIcon />,
        text: "Motivation",
        url: "/#motivation",
      },
      {
        icon: <MapIcon />,
        text: "Roadmap",
        url: "/#roadmap",
      },
      {
        icon: <HeartIcon />,
        text: "Sponsor",
        url: "/#sponsors",
      },
      {
        type: "icon",
        label: "Discord Community",
        text: "Discord",
        icon: <DiscordIcon />,
        url: "https://discord.gg/Q3AQUBKqt",
        external: true,
      },
      {
        type: "icon",
        label: "X (Twitter)",
        text: "X (Twitter)",
        icon: <XIcon />,
        url: "https://x.com/taserjs",
        external: true,
      },
    ],
    githubUrl: `https://github.com/${gitConfig.user}/${gitConfig.repo}`,
  };
}
