export type OpenGraphAssets = {
  heroGlow: string;
  logo: string;
};

export type OpenGraphTemplateProps = {
  title: string;
  description: string;
  assets: OpenGraphAssets;
};

function toDataUrl(asset: string) {
  return `data:image/svg+xml;base64,${asset}`;
}

export function OpenGraphTemplate({ title, description, assets }: OpenGraphTemplateProps) {
  const heroGlowUrl = toDataUrl(assets.heroGlow);
  const logoUrl = toDataUrl(assets.logo);

  return (
    <div className="og-root">
      <div className="og-card" style={{ backgroundImage: `url(${heroGlowUrl})` }}>
        <div className="og-glow-secondary" />
        <div className="og-inner">
          {/* Top HUD Header */}
          <div className="og-hud-header">
            <div className="og-hud-brand">
              <span className="og-hud-bolt">⚡</span>
              <span className="og-hud-label">TASER // TYPE-SAFE REST ROUTER</span>
            </div>
            <div className="og-hud-badge">
              <span className="og-hud-dot" />
              <span className="og-hud-status">MULTI-CLOUD READY</span>
            </div>
          </div>

          {/* Main Content */}
          <div className="og-content">
            <h1 className="og-title">{title}</h1>
            <p className="og-description">{description}</p>
          </div>

          {/* Fixed Feature Chips */}
          <div className="og-chips">
            <div className="og-chip">
              <span className="og-chip-icon">⚡</span>
              <span>File-Based Routing</span>
            </div>
            <div className="og-chip">
              <span className="og-chip-icon">🔒</span>
              <span>Compile-Time Contracts</span>
            </div>
            <div className="og-chip">
              <span className="og-chip-icon">🛡️</span>
              <span>Cascading Middleware</span>
            </div>
            <div className="og-chip">
              <span className="og-chip-icon">✨</span>
              <span>Zero-Drift Client</span>
            </div>
          </div>

          {/* HUD Footer */}
          <div className="og-footer">
            <img className="og-logo" src={logoUrl} alt="Taser Logo" />
            <div className="og-url-box">
              <span className="og-url">https://taserjs.dev</span>
              <span className="og-cursor">&gt;_</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
