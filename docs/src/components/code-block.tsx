import type { BundledLanguage } from 'shiki'

import { highlightCode } from '@/lib/highlight-code'
import { cn } from '@/lib/cn'

interface CodeBlockProps {
  children: string
  lang?: BundledLanguage
  className?: string
}

export async function CodeBlock({ children, lang = 'ts', className }: CodeBlockProps) {
  const html = await highlightCode(children, lang)

  return (
    <div
      className={cn(className)}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}

interface CodeBlockHtmlProps {
  html: string
  className?: string
}

/** Client-safe: renders pre-highlighted Shiki HTML. */
export function CodeBlockHtml({ html, className }: CodeBlockHtmlProps) {
  return (
    <div
      className={cn(className)}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
