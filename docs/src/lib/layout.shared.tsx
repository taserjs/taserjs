import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared'

import { Logo } from '@/components/logo'
import { gitConfig } from './shared'
import { BookOpenIcon, BrainIcon, HeartIcon } from 'lucide-react'

export function baseOptions(): BaseLayoutProps {
  const githubUrl = gitConfig.user && gitConfig.repo
    ? `https://github.com/${gitConfig.user}/${gitConfig.repo}`
    : undefined

  return {
    nav: {
      title: (
        <span className="flex items-center gap-2.5 font-semibold">
          <Logo className="h-6" />
        </span>
      ),
      transparentMode: 'top',
    },
    links: [
      {
        icon: <BookOpenIcon />,
        text: 'Documentation',
        url: '/docs',
        active: 'nested-url',
      },
      {
        icon: <BrainIcon />,
        text: 'Motivation',
        url: '/motivation',
      },
      {
        icon: <HeartIcon />,
        text: 'Sponsor',
        url: '/sponsor',
      },
    ],
    ...(githubUrl ? { githubUrl } : {}),
  }
}
