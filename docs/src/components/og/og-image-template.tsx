import type { OgAssets } from '@/lib/og-assets'

export type OgImageTemplateProps = {
  title: string
  description: string
  assets: OgAssets
}

export function OgImageTemplate({ title, description, assets }: OgImageTemplateProps) {
  return (
    <div className="og-root">
      <div
        className="og-card"
        style={{ backgroundImage: `url(${assets.heroGlow})` }}
      >
        <div className="og-glow-secondary" />
        <div className="og-inner">
          <div className="og-content">
            <p className="og-title">{title}</p>
            {description
              ? (
                  <>
                    <p className="og-description">{description}</p>
                    <div className="og-separator" />
                  </>
                )
              : null}
          </div>
          <div className="og-footer">
            <img
              className="og-logo"
              src={assets.logo}
              alt="Taser"
              width={140}
              height={53}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
