import type { ReactNode } from 'react'
import { Card } from 'fumadocs-ui/components/card'
import { cn } from '@/lib/cn'

export const iconTones = {
  violet:
    '[&>div:first-child]:border-violet-500/20 [&>div:first-child]:bg-violet-500/10 [&>div:first-child]:text-violet-600 dark:[&>div:first-child]:text-violet-400',
  sky:
    '[&>div:first-child]:border-sky-500/20 [&>div:first-child]:bg-sky-500/10 [&>div:first-child]:text-sky-600 dark:[&>div:first-child]:text-sky-400',
  emerald:
    '[&>div:first-child]:border-emerald-500/20 [&>div:first-child]:bg-emerald-500/10 [&>div:first-child]:text-emerald-600 dark:[&>div:first-child]:text-emerald-400',
  amber:
    '[&>div:first-child]:border-amber-500/20 [&>div:first-child]:bg-amber-500/10 [&>div:first-child]:text-amber-600 dark:[&>div:first-child]:text-amber-400',
  indigo:
    '[&>div:first-child]:border-indigo-500/20 [&>div:first-child]:bg-indigo-500/10 [&>div:first-child]:text-indigo-600 dark:[&>div:first-child]:text-indigo-400',
  rose:
    '[&>div:first-child]:border-rose-500/20 [&>div:first-child]:bg-rose-500/10 [&>div:first-child]:text-rose-600 dark:[&>div:first-child]:text-rose-400',
  cyan:
    '[&>div:first-child]:border-cyan-500/20 [&>div:first-child]:bg-cyan-500/10 [&>div:first-child]:text-cyan-600 dark:[&>div:first-child]:text-cyan-400',
  orange:
    '[&>div:first-child]:border-[color-mix(in_oklab,var(--landing-accent)_25%,transparent)] [&>div:first-child]:bg-[color-mix(in_oklab,var(--landing-accent)_12%,transparent)] [&>div:first-child]:text-landing-accent',
} as const

export type IconTone = keyof typeof iconTones

type FeatureCardProps = {
  icon: ReactNode
  title: string
  description: string
  href?: string
  iconTone?: IconTone
  className?: string
}

export function FeatureCard({
  icon,
  title,
  description,
  href,
  iconTone = 'violet',
  className,
}: FeatureCardProps) {
  return (
    <Card
      href={href}
      icon={icon}
      title={title}
      description={description}
      className={cn(
        '@max-lg:col-span-1',
        'group transition-all duration-300 ease-out',
        'hover:-translate-y-1 hover:shadow-lg hover:border-fd-primary/30',
        'hover:[&>div:first-child]:scale-105',
        iconTones[iconTone],
        className,
      )}
    />
  )
}
