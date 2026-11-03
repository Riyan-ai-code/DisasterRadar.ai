import React, { useState, useEffect, useRef, useCallback } from 'react';

const MIN_SIDEBAR_WIDTH = 76;
const SNAP_COLLAPSE_THRESHOLD = 135;
const DEFAULT_SIDEBAR_WIDTH = 240;
const MAX_SIDEBAR_WIDTH = 420;

export default function Sidebar({ isOpen, isDesktopHidden = false, activeTab, onSelectTab, onOpenModal, onDownloadApp }) {
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    try {
      const saved = Number(localStorage.getItem('disasterradar_sidebar_width'));
      if (!isNaN(saved) && saved >= MIN_SIDEBAR_WIDTH && saved <= MAX_SIDEBAR_WIDTH) {
        return saved;
      }
    } catch (e) {}
    return DEFAULT_SIDEBAR_WIDTH;
  });
  const [isResizing, setIsResizing] = useState(false);
  const [isHoveringHandle, setIsHoveringHandle] = useState(false);
  const sidebarRef = useRef(null);

  const isCompact = sidebarWidth <= 110;

  const persistWidth = useCallback((w) => {
    try {
      localStorage.setItem('disasterradar_sidebar_width', String(w));
    } catch (e) {}
    // Notify Leaflet maps and responsive charts to invalidate size
    setTimeout(() => {
      window.dispatchEvent(new Event('resize'));
    }, 60);
  }, []);

  const handleMouseDownResize = useCallback((e) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e) => {
      const newX = e.clientX;
      if (newX < SNAP_COLLAPSE_THRESHOLD) {
        setSidebarWidth(MIN_SIDEBAR_WIDTH);
      } else {
        const clamped = Math.max(180, Math.min(MAX_SIDEBAR_WIDTH, newX));
        setSidebarWidth(clamped);
      }
    };

    const handleMouseUp = (e) => {
      setIsResizing(false);
      const finalX = e.clientX;
      const finalWidth = finalX < SNAP_COLLAPSE_THRESHOLD
        ? MIN_SIDEBAR_WIDTH
        : Math.max(180, Math.min(MAX_SIDEBAR_WIDTH, finalX));
      setSidebarWidth(finalWidth);
      persistWidth(finalWidth);
    };

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, persistWidth]);

  const toggleCompactOrDefault = () => {
    const nextWidth = isCompact ? DEFAULT_SIDEBAR_WIDTH : MIN_SIDEBAR_WIDTH;
    setSidebarWidth(nextWidth);
    persistWidth(nextWidth);
  };

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
    { id: 'cyclone', label: 'Cyclone & Coastal Risk', icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 4H12a8 8 0 0 0-8 8c0 4.42 3.58 8 8 8h9"/>
        <path d="M3 20h9a8 8 0 0 0 8-8c0-4.42-3.58-8-8-8H3"/>
        <circle cx="12" cy="12" r="2.5"/>
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
    { id: 'about', label: 'System Architecture', icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/>
        <path d="M12 16v-4"/>
        <path d="M12 8h.01"/>
      </svg>
    )}
  ];

  const effectiveWidth = isDesktopHidden ? 0 : sidebarWidth;

  return (
    <aside
      ref={sidebarRef}
      className={`sidebar ${isOpen ? 'open' : ''} ${isCompact ? 'sidebar-compact' : ''} ${isDesktopHidden ? 'sidebar-hidden-desktop' : ''}`}
      style={{
        width: `${effectiveWidth}px`,
        minWidth: `${effectiveWidth}px`,
        maxWidth: `${effectiveWidth}px`,
        position: 'relative',
        overflow: isDesktopHidden ? 'hidden' : 'visible',
        background: 'rgba(8, 12, 22, 0.95)',
        borderRight: isDesktopHidden
          ? 'none'
          : isResizing || isHoveringHandle
          ? '1px solid rgba(56, 189, 248, 0.75)'
          : '1px solid rgba(56, 189, 248, 0.15)',
        transition: isResizing ? 'none' : 'width 0.18s ease, min-width 0.18s ease, max-width 0.18s ease, padding 0.18s ease, border-color 0.15s ease',
        padding: isDesktopHidden ? '0px' : isCompact ? '16px 8px 20px 8px' : '16px 14px 20px 14px'
      }}
    >
      <div>
        <div
          className="brand-header"
          style={{
            padding: isCompact ? '14px 4px' : '18px 12px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: isCompact ? 'center' : 'space-between',
            gap: '8px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, overflow: 'hidden' }}>
            <div
              className="brand-logo-icon"
              onClick={isCompact ? toggleCompactOrDefault : undefined}
              title={isCompact ? 'Click to expand sidebar (240px)' : 'DisasterRadar.ai Command Operating Center'}
              style={{
                width: '36px',
                height: '36px',
                flexShrink: 0,
                borderRadius: '10px',
                background: '#0284c7',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                cursor: isCompact ? 'pointer' : 'default'
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/>
                <path d="M4 22c2-1 4-1 6 0 2 1 4 1 6 0 2-1 4-1 6 0"/>
              </svg>
            </div>
            {!isCompact && (
              <div style={{ minWidth: 0, overflow: 'hidden' }}>
                <span className="brand-title" style={{ fontSize: '1rem', fontWeight: 800, color: '#f8fafc', letterSpacing: '-0.02em', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  DisasterRadar<span style={{ color: '#38bdf8' }}>.ai</span>
                </span>
                <span style={{ fontSize: '0.62rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  Command Operating Center
                </span>
              </div>
            )}
          </div>

          {!isCompact && (
            <button
              onClick={toggleCompactOrDefault}
              title="Collapse sidebar to compact icon view (or drag right edge to resize)"
              style={{
                background: 'rgba(15, 23, 42, 0.8)',
                border: '1px solid rgba(56, 189, 248, 0.2)',
                color: '#94a3b8',
                borderRadius: '6px',
                width: '26px',
                height: '26px',
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                fontSize: '0.8rem'
              }}
            >
              «
            </button>
          )}
        </div>

        <nav className="sidebar-nav" style={{ padding: isCompact ? '14px 4px' : '16px 10px' }}>
          {navItems.map(item => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                className={`nav-item ${isActive ? 'active' : ''}`}
                onClick={() => onSelectTab(item.id)}
                title={item.label}
                style={{
                  background: isActive ? '#111a2d' : 'transparent',
                  color: isActive ? '#38bdf8' : '#94a3b8',
                  borderLeft: isActive ? '3px solid #38bdf8' : '3px solid transparent',
                  borderRadius: '6px',
                  margin: '3px 0',
                  padding: isCompact ? '10px 0' : '9px 12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: isCompact ? 'center' : 'flex-start',
                  gap: '10px',
                  fontSize: '0.8rem',
                  fontWeight: isActive ? 700 : 500,
                  transition: 'all 0.2s ease',
                  cursor: 'pointer',
                  width: '100%',
                  textAlign: 'left',
                  overflow: 'hidden'
                }}
              >
                <div style={{ width: '18px', height: '18px', flexShrink: 0 }}>
                  {item.icon}
                </div>
                {!isCompact && (
                  <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {item.label}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      <div className="sidebar-footer" style={{ padding: isCompact ? '12px 4px' : '16px', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
        <button
          onClick={onDownloadApp}
          title="Download App (PC & Mobile)"
          style={{
            width: '100%',
            background: '#0284c7',
            border: '1px solid #38bdf8',
            color: '#ffffff',
            borderRadius: '6px',
            padding: isCompact ? '9px 0' : '9px 12px',
            marginBottom: isCompact ? '8px' : '12px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            fontSize: '0.74rem',
            fontWeight: 800,
            boxShadow: '0 0 10px rgba(2, 132, 199, 0.35)',
            overflow: 'hidden'
          }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ flexShrink: 0 }}>
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          {!isCompact && (
            <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              📲 Download App (PC & Mobile)
            </span>
          )}
        </button>

        {!isCompact ? (
          <>
            <div
              className="about-box"
              style={{
                background: 'rgba(15, 23, 42, 0.6)',
                border: '1px solid rgba(56, 189, 248, 0.12)',
                borderRadius: '8px',
                padding: '10px'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <h4 style={{ margin: 0, fontSize: '0.72rem', color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Sidebar Width
                </h4>
                <span style={{ fontSize: '0.68rem', color: '#94a3b8', fontWeight: 700 }}>
                  {sidebarWidth}px
                </span>
              </div>
              <input
                type="range"
                min="180"
                max={MAX_SIDEBAR_WIDTH}
                value={Math.max(180, sidebarWidth)}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setSidebarWidth(val);
                  persistWidth(val);
                }}
                title="Slide or drag the right border of the sidebar to adjust width"
                style={{ width: '100%', accentColor: '#38bdf8', cursor: 'pointer', height: '4px', marginBottom: '6px' }}
              />
              <p style={{ margin: 0, fontSize: '0.65rem', color: '#94a3b8', lineHeight: 1.35 }}>
                Drag the right edge or use slider to resize ({MIN_SIDEBAR_WIDTH}px–{MAX_SIDEBAR_WIDTH}px).
              </p>
            </div>

            <div className="dev-credit" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '12px', overflow: 'hidden' }}>
              <div
                className="dev-icon"
                style={{
                  width: '28px',
                  height: '28px',
                  flexShrink: 0,
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
              <div className="dev-text" style={{ minWidth: 0, overflow: 'hidden' }}>
                <span className="dev-label" style={{ fontSize: '0.62rem', color: '#64748b', display: 'block' }}>Engine</span>
                <span className="dev-team" style={{ fontSize: '0.74rem', color: '#e2e8f0', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block' }}>
                  Disaster Intelligence Lab
                </span>
              </div>
            </div>
          </>
        ) : (
          <button
            onClick={toggleCompactOrDefault}
            title="Expand sidebar to full width"
            style={{
              width: '100%',
              background: 'rgba(15, 23, 42, 0.8)',
              border: '1px solid rgba(56, 189, 248, 0.25)',
              color: '#38bdf8',
              borderRadius: '6px',
              padding: '7px 0',
              cursor: 'pointer',
              fontSize: '0.85rem',
              fontWeight: 800
            }}
          >
            »
          </button>
        )}
      </div>

      {/* INTERACTIVE DRAG RESIZE HANDLE ON RIGHT BORDER */}
      <div
        onMouseDown={handleMouseDownResize}
        onDoubleClick={() => {
          const resetW = sidebarWidth === DEFAULT_SIDEBAR_WIDTH ? 300 : DEFAULT_SIDEBAR_WIDTH;
          setSidebarWidth(resetW);
          persistWidth(resetW);
        }}
        onMouseEnter={() => setIsHoveringHandle(true)}
        onMouseLeave={() => setIsHoveringHandle(false)}
        title="Drag horizontally to resize sidebar width (Double-click to reset)"
        style={{
          position: 'absolute',
          top: 0,
          right: '-4px',
          width: '8px',
          height: '100%',
          cursor: 'col-resize',
          zIndex: 200,
          background: isResizing
            ? 'rgba(56, 189, 248, 0.65)'
            : isHoveringHandle
            ? 'rgba(56, 189, 248, 0.35)'
            : 'transparent',
          transition: 'background 0.15s ease',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        {/* Subtle center grip pill */}
        <div
          style={{
            width: '3px',
            height: '36px',
            borderRadius: '4px',
            background: isResizing || isHoveringHandle ? '#38bdf8' : 'rgba(148, 163, 184, 0.25)',
            transition: 'background 0.15s ease'
          }}
        />
      </div>
    </aside>
  );
}
