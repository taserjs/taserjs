export type OpenGraphAssets = {
  heroGlow: string,
  logo: string,
}
export type OpenGraphTemplateProps = {
  title: string
  description: string
  assets: OpenGraphAssets
}

function toDataUrl(asset: string) {
  return `data:image/svg+xml;base64,${asset}`
}

export function OpenGraphTemplate({ title, description, assets }: OpenGraphTemplateProps) {
  const heroGlowUrl = toDataUrl(assets.heroGlow)
  const logoUrl = toDataUrl(assets.logo)

  return (
    <div className="og-root">
      <div
        className="og-card"
        style={{ backgroundImage: `url(${heroGlowUrl})` }}
      >
        <div className="og-glow-secondary" />
        <div className="og-inner">
          <div className="og-content">
            <p className="og-title">{title}</p>
            <p className="og-description">{description}</p>
            <div className="og-separator" />
          </div>
          <div className="og-footer">
            <img className="og-logo" src={logoUrl} alt="Taser Logo" />
            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
          </div>
        </div>
      </div>
    </div>
  )
}

