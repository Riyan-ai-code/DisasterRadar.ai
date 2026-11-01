import React from 'react';

export default function Sidebar({ isOpen, activeTab, onSelectTab, onOpenModal, onDownloadApp }) {
  const navItems = [
    { id: 'dashboard', label: 'Executive Dashboard', icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
        <polyline points="9 22 9 12 15 12 15 22"/>
      </svg>
    )},
    { id: 'predict', label: 'Predict Risk Studio', icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8"/>
        <path d="m21 21-4.3-4.3"/>
        <path d="M11 8v6M8 11h6"/>
      </svg>
    )},
    { id: 'map', label: '3D World Globe & GIS', icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/>
        <line x1="9" x2="9" y1="3" y2="18"/>
        <line x1="15" x2="15" y1="6" y2="21"/>
      </svg>
    )},
    { id: 'evacuation', label: 'Offline Evacuation & Roads', icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
        <path d="m9 12 2 2 4-4"/>
      </svg>
    )},
    { id: 'historical', label: 'Historical Disaster Atlas', icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect width="18" height="18" x="3" y="4" rx="2" ry="2"/>
        <line x1="16" x2="16" y1="2" y2="6"/>
        <line x1="8" x2="8" y1="2" y2="6"/>
        <line x1="3" x2="21" y1="10" y2="10"/>
      </svg>
    )},
    { id: 'performance', label: 'Model Performance Studio', icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" x2="18" y1="20" y2="10"/>
        <line x1="12" x2="12" y1="20" y2="4"/>
        <line x1="6" x2="6" y1="20" y2="14"/>
      </svg>
    )},
    { id: 'alerts', label: 'Early Warning & Alerts', icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/>
        <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>
      </svg>
    )},
    { id: 'explainer', label: 'Explainable AI & SOPs', icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 12c2.5-2.5 5-2.5 7.5 0s5 2.5 7.5 0 5-2.5 5-2.5"/>
        <path d="M2 17c2.5-2.5 5-2.5 7.5 0s5 2.5 7.5 0 5-2.5 5-2.5"/>
        <path d="M12 3v5"/>
        <path d="M10 5l2-2 2 2"/>
      </svg>
    )},
    { id: 'chatbot', label: 'Flood Prevention Chatbot', badge: 'Gemini AI', icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        <path d="M8 9h8"/>
        <path d="M8 13h5"/>
      </svg>
    )},
    { id: 'about', label: 'System Architecture', icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/>
        <path d="M12 16v-4"/>
        <path d="M12 8h.01"/>
      </svg>
    )}
  ];

  return (
    <aside className={`sidebar ${isOpen ? 'open' : ''}`} style={{ background: 'rgba(8, 12, 22, 0.95)', borderRight: '1px solid rgba(56, 189, 248, 0.15)' }}>
      <div>
        <div className="brand-header" style={{ padding: '20px 16px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
          <div
            className="brand-logo-icon"
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: '#0284c7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff'
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/>
              <path d="M4 22c2-1 4-1 6 0 2 1 4 1 6 0 2-1 4-1 6 0"/>
            </svg>
          </div>
          <div>
            <span className="brand-title" style={{ fontSize: '1rem', fontWeight: 800, color: '#f8fafc', letterSpacing: '-0.02em', display: 'block' }}>
              DisasterRadar<span style={{ color: '#38bdf8' }}>.ai</span>
            </span>
            <span style={{ fontSize: '0.62rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Command Operating Center
            </span>
          </div>
        </div>

        <nav className="sidebar-nav" style={{ padding: '16px 10px' }}>
          {navItems.map(item => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                className={`nav-item ${isActive ? 'active' : ''}`}
                onClick={() => onSelectTab(item.id)}
                style={{
                  background: isActive ? '#111a2d' : 'transparent',
                  color: isActive ? '#38bdf8' : '#94a3b8',
                  borderLeft: isActive ? '3px solid #38bdf8' : '3px solid transparent',
                  borderRadius: '6px',
                  margin: '3px 0',
                  padding: '9px 12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  fontSize: '0.8rem',
                  fontWeight: isActive ? 700 : 500,
                  transition: 'all 0.2s ease',
                  cursor: 'pointer',
                  width: '100%',
                  textAlign: 'left'
                }}
              >
                <div style={{ width: '18px', height: '18px', flexShrink: 0 }}>
                  {item.icon}
                </div>
                <span style={{ flex: 1 }}>{item.label}</span>
                {item.badge && (
                  <span style={{
                    background: 'rgba(56, 189, 248, 0.15)',
                    color: '#38bdf8',
                    border: '1px solid rgba(56, 189, 248, 0.3)',
                    borderRadius: '10px',
                    padding: '1px 6px',
                    fontSize: '0.65rem',
                    fontWeight: 800
                  }}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      <div className="sidebar-footer" style={{ padding: '16px', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
        <button
          onClick={onDownloadApp}
          style={{
            width: '100%',
            background: '#0284c7',
            border: '1px solid #38bdf8',
            color: '#ffffff',
            borderRadius: '6px',
            padding: '9px 12px',
            marginBottom: '12px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            fontSize: '0.74rem',
            fontWeight: 800,
            boxShadow: '0 0 10px rgba(2, 132, 199, 0.35)'
          }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          <span>📲 Download App (PC & Mobile)</span>
        </button>

        <div
          className="about-box"
          style={{
            background: 'rgba(15, 23, 42, 0.6)',
            border: '1px solid rgba(56, 189, 248, 0.12)',
            borderRadius: '8px',
            padding: '10px'
          }}
        >
          <h4 style={{ margin: '0 0 4px 0', fontSize: '0.74rem', color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Mission Protocol
          </h4>
          <p style={{ margin: 0, fontSize: '0.68rem', color: '#94a3b8', lineHeight: 1.4 }}>
            Ingesting real-time Open-Meteo & Copernicus telemetry with calibrated XGBoost (T*=0.55).
          </p>
        </div>

        <div className="dev-credit" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '12px' }}>
          <div
            className="dev-icon"
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '6px',
              background: 'rgba(56, 189, 248, 0.1)',
              border: '1px solid rgba(56, 189, 248, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#38bdf8'
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="4" y="4" width="16" height="16" rx="2"/>
              <rect x="9" y="9" width="6" height="6"/>
              <line x1="9" y1="2" x2="9" y2="4"/>
              <line x1="15" y1="2" x2="15" y2="4"/>
            </svg>
          </div>
          <div className="dev-text">
            <span className="dev-label" style={{ fontSize: '0.62rem', color: '#64748b', display: 'block' }}>Engine</span>
            <span className="dev-team" style={{ fontSize: '0.74rem', color: '#e2e8f0', fontWeight: 600 }}>Disaster Intelligence Lab</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
