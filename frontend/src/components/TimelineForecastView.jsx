import React, { useState, useEffect } from 'react';
import { fetchTimelineForecast } from '../services/api';

export default function TimelineForecastView({ parameters, locationName }) {
  const [timelineData, setTimelineData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [rainfallTrend, setRainfallTrend] = useState('DECAYING');
  const [upstreamArea, setUpstreamArea] = useState(15.0);

  useEffect(() => {
    let isMounted = true;
    async function loadForecast() {
      if (!parameters) return;
      setLoading(true);
      setError(null);
      try {
        const data = await fetchTimelineForecast(parameters, upstreamArea, rainfallTrend);
        if (isMounted) setTimelineData(data);
      } catch (err) {
        if (isMounted) setError(err.message || 'Failed to load timeline forecast');
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadForecast();
    return () => { isMounted = false; };
  }, [parameters, rainfallTrend, upstreamArea]);

  const catchment = timelineData?.catchment_hydrodynamics;
  const points = timelineData?.forecast_timeline || [];

  return (
    <div
      className="card"
      style={{
        background: 'linear-gradient(180deg, #0b1120 0%, #070d18 100%)',
        border: '1px solid rgba(56, 189, 248, 0.25)',
        borderRadius: '12px',
        padding: '20px',
        marginBottom: '20px',
        boxShadow: '0 12px 36px rgba(0, 0, 0, 0.6)'
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '1.25rem' }}>⏳</span>
            <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#f8fafc', letterSpacing: '-0.01em' }}>
              Multi-Horizon Inundation Timeline (+3h to +48h)
            </h3>
            <span
              style={{
                fontSize: '0.65rem',
                fontWeight: 800,
                color: '#38bdf8',
                background: 'rgba(56, 189, 248, 0.15)',
                border: '1px solid rgba(56, 189, 248, 0.3)',
                padding: '2px 8px',
                borderRadius: '6px'
              }}
            >
              CATCHMENT HYDRODYNAMICS
            </span>
          </div>
          <p style={{ margin: '4px 0 0', fontSize: '0.78rem', color: '#94a3b8' }}>
            Couples acute rainfall with upstream river basin runoff arrival lag and drainage dissipation for {locationName || 'Monitored Sector'}.
          </p>
        </div>

        {/* Storm Trend Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(15, 23, 42, 0.8)', padding: '4px', borderRadius: '8px', border: '1px solid #1e293b' }}>
          <span style={{ fontSize: '0.72rem', color: '#94a3b8', padding: '0 6px', fontWeight: 600 }}>Trend:</span>
          {[
            { id: 'DECAYING', label: '🌤️ Decaying' },
            { id: 'PERSISTENT', label: '🌧️ Persistent' },
            { id: 'INTENSIFYING', label: '⛈️ Intensifying' }
          ].map(trend => (
            <button
              key={trend.id}
              onClick={() => setRainfallTrend(trend.id)}
              style={{
                background: rainfallTrend === trend.id ? '#0284c7' : 'transparent',
                color: rainfallTrend === trend.id ? '#ffffff' : '#94a3b8',
                border: 'none',
                borderRadius: '6px',
                padding: '4px 10px',
                fontSize: '0.72rem',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              {trend.label}
            </button>
          ))}
        </div>
      </div>

      {/* Upstream Catchment Summary Banner */}
      {catchment && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '12px',
            background: 'rgba(15, 23, 42, 0.65)',
            border: '1px solid rgba(56, 189, 248, 0.18)',
            borderRadius: '8px',
            padding: '12px 14px',
            marginBottom: '16px'
          }}
        >
          <div>
            <div style={{ fontSize: '0.68rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>
              Upstream Basin Area
            </div>
            <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#e2e8f0', marginTop: '2px' }}>
              {catchment.upstream_area_km2} km²
              <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 500, marginLeft: '6px' }}>
                (L ≈ {catchment.catchment_length_km} km)
              </span>
            </div>
          </div>

          <div>
            <div style={{ fontSize: '0.68rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>
              Runoff Arrival Lag (Tc)
            </div>
            <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#38bdf8', marginTop: '2px' }}>
              ~{catchment.transit_time_hours} Hours
              <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 500, marginLeft: '6px' }}>
                to peak wave
              </span>
            </div>
          </div>

          <div>
            <div style={{ fontSize: '0.68rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>
              Peak Discharge (Q)
            </div>
            <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#f59e0b', marginTop: '2px' }}>
              {catchment.peak_flow_m3s} m³/s
            </div>
          </div>

          <div>
            <div style={{ fontSize: '0.68rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>
              Peak Threat Window
            </div>
            <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#ef4444', marginTop: '2px' }}>
              {timelineData?.peak_threat_horizon} ({timelineData?.peak_probability}%)
            </div>
          </div>
        </div>
      )}

      {/* Loading & Error States */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '24px', color: '#94a3b8', fontSize: '0.85rem' }}>
          Simulating kinematic wave runoff routing across horizons...
        </div>
      )}

      {error && (
        <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid #ef4444', color: '#fca5a5', padding: '10px 14px', borderRadius: '6px', fontSize: '0.8rem', marginBottom: '14px' }}>
          ⚠️ {error}
        </div>
      )}

      {/* Multi-Horizon Cards Grid */}
      {!loading && points.length > 0 && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '12px'
          }}
        >
          {points.map((pt, idx) => {
            const isCritical = pt.risk_level === 'CRITICAL' || pt.probability >= 70;
            const isHigh = !isCritical && (pt.risk_level === 'HIGH' || pt.probability >= 50);
            const isModerate = !isCritical && !isHigh && pt.probability >= 30;

            const cardColor = isCritical ? '#ef4444' : (isHigh ? '#f97316' : (isModerate ? '#eab308' : '#10b981'));
            const cardBg = isCritical ? 'rgba(239, 68, 68, 0.08)' : (isHigh ? 'rgba(249, 115, 22, 0.08)' : 'rgba(15, 23, 42, 0.7)');

            return (
              <div
                key={idx}
                style={{
                  background: cardBg,
                  border: `1px solid ${cardColor}44`,
                  borderRadius: '10px',
                  padding: '14px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  transition: 'transform 0.15s ease',
                  position: 'relative',
                  overflow: 'hidden'
                }}
              >
                {/* Top Bar */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#f8fafc', fontFamily: 'JetBrains Mono, monospace' }}>
                    {pt.horizon_label}
                  </span>
                  <span
                    style={{
                      fontSize: '0.62rem',
                      fontWeight: 800,
                      color: cardColor,
                      background: 'rgba(0,0,0,0.4)',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      border: `1px solid ${cardColor}66`
                    }}
                  >
                    {pt.risk_level}
                  </span>
                </div>

                {/* Probability & Physical Depth */}
                <div style={{ margin: '6px 0 10px' }}>
                  <div style={{ fontSize: '1.45rem', fontWeight: 900, color: cardColor, lineHeight: 1 }}>
                    {pt.probability}%
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px' }}>
                    <span style={{ fontSize: '0.78rem', color: '#e2e8f0', fontWeight: 700 }}>
                      🌊 {pt.inundation_depth_meters} m
                    </span>
                    <span style={{ fontSize: '0.65rem', color: '#94a3b8' }}>
                      ({pt.simulated_rainfall_mm}mm rain)
                    </span>
                  </div>
                  <div style={{ fontSize: '0.68rem', color: '#94a3b8', marginTop: '2px' }}>
                    {pt.depth_tier}
                  </div>
                </div>

                {/* Upstream Surge Flag */}
                {pt.surge_inflow_active && (
                  <div
                    style={{
                      fontSize: '0.62rem',
                      fontWeight: 800,
                      color: '#fbbf24',
                      background: 'rgba(245, 158, 11, 0.15)',
                      border: '1px dashed #f59e0b',
                      borderRadius: '4px',
                      padding: '3px 6px',
                      marginBottom: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <span>⚡</span> Runoff Arrival Window
                  </div>
                )}

                {/* Directive Snippet */}
                <div
                  style={{
                    fontSize: '0.68rem',
                    color: '#cbd5e1',
                    lineHeight: 1.35,
                    borderTop: '1px solid rgba(255,255,255,0.08)',
                    paddingTop: '6px',
                    minHeight: '38px'
                  }}
                  title={pt.life_safety_directive}
                >
                  {pt.life_safety_directive.length > 70
                    ? pt.life_safety_directive.slice(0, 68) + '...'
                    : pt.life_safety_directive}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
