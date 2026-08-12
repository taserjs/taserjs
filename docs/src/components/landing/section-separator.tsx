import { cn } from '@/lib/cn'

interface SectionSeparatorProps {
  position?: 'top' | 'bottom'
  className?: string
}

export function SectionSeparator({ position = 'top', className }: SectionSeparatorProps) {
  return (
    <div
      aria-hidden
      className={cn(
        'landing-section-separator',
        position === 'top' ? 'top-0' : 'bottom-0',
        className,
      )}
    />
  )
}
