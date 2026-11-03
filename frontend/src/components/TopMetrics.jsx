import React from 'react';

export default function TopMetrics({
  probability,
  riskLevel,
  location,
  latitude,
  longitude,
  recommendation,
  prediction,
  locationTab = 'myLocation',
  homeLocation,
  onSwitchToMyLocation,
  onOpenExplainer,
  onOpenLocationModal
}) {
  // Compute SVG Donut Progress Circle offset
  const radius = 32;
  const circumference = 2 * Math.PI * radius;
  const progressPercent = Math.min(100, Math.max(0, probability || 0));
  const strokeDashoffset = circumference - (progressPercent / 100) * circumference;

  // Single solid color mapping based strictly on risk function
  const isCritical = riskLevel === 'CRITICAL' || riskLevel === 'SEVERE' || probability >= 70;
  const isHigh = !isCritical && (riskLevel === 'HIGH' || (probability >= 50 && probability < 70));
  const isModerate = !isCritical && !isHigh && (riskLevel === 'MODERATE' || (probability >= 30 && probability < 50));

  let riskColor = '#10b981'; // Solid safe emerald
  let riskBadgeLabel = 'LOW RISK';
  let riskBgAlpha = 'rgba(16, 185, 129, 0.12)';

  if (isCritical) {
    riskColor = '#ef4444'; // Solid hazard crimson
    riskBadgeLabel = 'CRITICAL HAZARD';
    riskBgAlpha = 'rgba(239, 68, 68, 0.16)';
  } else if (isHigh) {
    riskColor = '#f97316'; // Solid high risk orange
    riskBadgeLabel = 'HIGH RISK';
    riskBgAlpha = 'rgba(249, 115, 22, 0.16)';
  } else if (isModerate) {
    riskColor = '#eab308'; // Solid warning amber
    riskBadgeLabel = 'MODERATE ALERT';
    riskBgAlpha = 'rgba(234, 179, 8, 0.16)';
  }

  const isSimulated = (prediction?.status || '').toUpperCase() === 'SIMULATED';
  const depthMeters = prediction?.inundationDepthMeters !== undefined ? prediction.inundationDepthMeters : 0.0;
  const depthTier = prediction?.depthTier || 'Tier 0: Surface Runoff (< 5 cm)';
  const flowVelocity = prediction?.flowVelocity || 'Stagnant Urban Ponding';
  const lifeSafetyDirective = prediction?.lifeSafetyDirective || recommendation;

  return (
    <section className="top-metrics-grid" style={{ marginBottom: '16px' }}>
      {/* 1. Flood Probability with 3D Radial Gauge */}
      <div
        className="card metric-card"
        style={{
          background: '#0b1120',
          border: '1px solid rgba(56, 189, 248, 0.18)',
          boxShadow: '0 8px 30px rgba(0, 0, 0, 0.5)'
        }}
      >
        <div className="metric-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '0.74rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94a3b8', fontWeight: 700 }}>
            Flood Probability
          </span>
          <span style={{
            fontSize: '0.62rem',
            background: isSimulated ? 'rgba(245, 158, 11, 0.15)' : 'rgba(16, 185, 129, 0.15)',
            color: isSimulated ? '#fbbf24' : '#34d399',
            padding: '2px 6px',
            borderRadius: '4px',
            border: `1px solid ${isSimulated ? 'rgba(245, 158, 11, 0.35)' : 'rgba(16, 185, 129, 0.35)'}`,
            fontWeight: 800
          }}>
            {isSimulated ? 'SIMULATED BASELINE' : 'LIVE MODEL (93.8%)'}
          </span>
        </div>
        <div className="metric-body" style={{ display: 'flex', alignItems: 'center', gap: '14px', marginTop: '6px' }}>
          <div className="donut-gauge-container" style={{ position: 'relative', width: '74px', height: '74px', flexShrink: 0 }}>
            <svg className="donut-gauge-svg" viewBox="0 0 74 74" style={{ transform: 'rotate(-90deg)', width: '100%', height: '100%' }}>
              <circle
                cx="37"
                cy="37"
                r={radius}
                fill="none"
                stroke="#1e293b"
                strokeWidth="6"
              />
              <circle
                cx="37"
                cy="37"
                r={radius}
                fill="none"
                stroke={riskColor}
                strokeWidth="6"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                style={{
                  transition: 'stroke-dashoffset 0.8s cubic-bezier(0.4, 0, 0.2, 1)'
                }}
              />
            </svg>
            <div
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                fontWeight: 800,
                fontSize: '0.92rem',
                color: '#ffffff',
                fontFamily: 'JetBrains Mono, monospace'
              }}
            >
              {Math.round(probability)}%
            </div>
          </div>
          <div className="metric-info">
            <div style={{ fontSize: '1.45rem', fontWeight: 800, color: riskColor, letterSpacing: '-0.02em', lineHeight: 1.1 }}>
              {probability}%
            </div>
            <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '4px' }}>
              {isCritical ? 'Inundation imminent' : (isHigh ? 'High saturation threat' : (isModerate ? 'Moderate waterlogging risk' : 'Conditions normal'))}
            </div>
          </div>
        </div>
      </div>

      {/* 2. Risk Classification & Physical Inundation Depth Tier */}
      <div
        className="card metric-card"
        style={{
          background: '#0b1120',
          border: `1px solid ${riskColor}44`,
          boxShadow: '0 8px 30px rgba(0, 0, 0, 0.5)'
        }}
      >
        <div className="metric-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '0.74rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94a3b8', fontWeight: 700 }}>
            Physical Inundation Tier
          </span>
          <span
            style={{
              fontSize: '0.65rem',
              color: depthMeters >= 0.45 ? '#fca5a5' : (depthMeters >= 0.15 ? '#fde68a' : '#34d399'),
              background: 'rgba(0, 0, 0, 0.3)',
              padding: '2px 6px',
              borderRadius: '4px',
              fontWeight: 800
            }}
          >
            🌊 {depthMeters} m
          </span>
        </div>
        <div className="metric-body" style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '6px' }}>
          <div
            style={{
              width: '46px',
              height: '46px',
              borderRadius: '12px',
              background: riskBgAlpha,
              border: `1px solid ${riskColor}55`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: riskColor,
              flexShrink: 0
            }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m3 9 9-7 9 7v5"/>
              <path d="M9 22V12h6v2"/>
              <path d="M2 17c2-1 4-1 6 0 2 1 4 1 6 0 2-1 4-1 6 0"/>
              <path d="M2 21c2-1 4-1 6 0 2 1 4 1 6 0 2-1 4-1 6 0"/>
            </svg>
          </div>
          <div className="metric-info" style={{ overflow: 'hidden' }}>
            <div style={{ fontSize: '1.05rem', fontWeight: 800, color: riskColor, letterSpacing: '0.01em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {depthTier}
            </div>
            <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '2px' }}>
              Flow: <strong style={{ color: '#cbd5e1' }}>{flowVelocity}</strong>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Location & Coordinates */}
      <div
        className="card metric-card"
        style={{
          background: '#0b1120',
          border: '1px solid rgba(56, 189, 248, 0.18)',
          boxShadow: '0 8px 30px rgba(0, 0, 0, 0.5)'
        }}
      >
        <div className="metric-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '0.74rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94a3b8', fontWeight: 700 }}>
            {locationTab === 'explore' ? 'Exploring Other Sector' : 'Monitored Home Sector'}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {locationTab === 'explore' && onSwitchToMyLocation && (
              <button
                type="button"
                onClick={onSwitchToMyLocation}
                style={{
                  background: 'rgba(16, 185, 129, 0.18)',
                  border: '1px solid #10b981',
                  color: '#34d399',
                  padding: '2px 7px',
                  borderRadius: '4px',
                  fontSize: '0.65rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
                title={`Back to Home Location: ${homeLocation?.name || 'Kharupetia'}`}
              >
                ↩️ Back Home
              </button>
            )}
            <span style={{
              fontSize: '0.65rem',
              background: locationTab === 'explore' ? 'rgba(56, 189, 248, 0.15)' : 'rgba(16, 185, 129, 0.12)',
              color: locationTab === 'explore' ? '#38bdf8' : '#10b981',
              padding: '2px 6px',
              borderRadius: '4px',
              border: `1px solid ${locationTab === 'explore' ? 'rgba(56, 189, 248, 0.3)' : 'rgba(16, 185, 129, 0.25)'}`,
              fontWeight: 700
            }}>
              {locationTab === 'explore' ? 'EXPLORING' : 'HOME (LIVE)'}
            </span>
          </div>
        </div>
        <div className="metric-body" style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '6px' }}>
          <div
            style={{
              width: '46px',
              height: '46px',
              borderRadius: '12px',
              background: 'rgba(56, 189, 248, 0.12)',
              border: '1px solid rgba(56, 189, 248, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#38bdf8',
              flexShrink: 0
            }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
            </svg>
          </div>
          <div className="metric-info" style={{ overflow: 'hidden' }}>
            <div style={{ fontSize: '0.98rem', fontWeight: 700, color: '#f8fafc', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {location || 'Mira Bhayandar, Maharashtra'}
            </div>
            <div style={{ fontSize: '0.72rem', color: '#38bdf8', fontFamily: 'JetBrains Mono, monospace', marginTop: '2px' }}>
              {latitude}° N • {longitude}° E
            </div>
          </div>
        </div>
      </div>

      {/* 4. Recommendation & Life-Safety Directive */}
      <div
        className="card metric-card recommendation-card"
        style={{
          background: '#0b1120',
          border: '1px solid rgba(56, 189, 248, 0.18)',
          boxShadow: '0 8px 30px rgba(0, 0, 0, 0.5)'
        }}
      >
        <div className="rec-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#f59e0b', fontSize: '0.74rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
              <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/>
            </svg>
            <span>Life-Safety Directive</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <a
              href="tel:112"
              style={{
                background: '#dc2626',
                border: '1px solid #ef4444',
                borderRadius: '4px',
                color: '#fff',
                fontSize: '0.65rem',
                fontWeight: 800,
                padding: '2px 6px',
                textDecoration: 'none'
              }}
              title="National Emergency Helpline"
            >
              📞 112
            </a>
            {onOpenExplainer && (
              <button
                onClick={onOpenExplainer}
                style={{
                  background: 'rgba(56, 189, 248, 0.12)',
                  border: '1px solid rgba(56, 189, 248, 0.3)',
                  borderRadius: '4px',
                  color: '#38bdf8',
                  fontSize: '0.68rem',
                  fontWeight: 700,
                  padding: '2px 8px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                Evacuation SOP →
              </button>
            )}
          </div>
        </div>
        <div className="rec-body" style={{ fontSize: '0.78rem', color: '#e2e8f0', lineHeight: 1.45 }}>
          {lifeSafetyDirective}
        </div>
      </div>
    </section>
  );
}
