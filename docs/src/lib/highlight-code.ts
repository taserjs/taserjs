import { codeToHtml, type BundledLanguage } from 'shiki'

export async function highlightCode(code: string, lang: BundledLanguage = 'ts') {
  return codeToHtml(code, {
    lang,
    themes: {
      light: 'github-light',
      dark: 'github-dark',
    },
    defaultColor: false,
  })
}
