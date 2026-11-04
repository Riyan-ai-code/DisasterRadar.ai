import React, { useState } from 'react';
import { geocodeLocation, reverseGeocodeCoords, fetchIpLocation } from '../services/api';


export default function LocationTransparencyBanner({
  activeLocation,
  params,
  prediction,
  isFetchingRealTelemetry,
  onLocationChange,
  externalModalOpen,
  onCloseExternalModal
}) {
  const [internalModalOpen, setInternalModalOpen] = useState(false);
  const isModalOpen = externalModalOpen !== undefined ? externalModalOpen : internalModalOpen;
  const setIsModalOpen = (val) => {
    setInternalModalOpen(val);
    if (!val && onCloseExternalModal) onCloseExternalModal();
  };
  const [searchInput, setSearchInput] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchStatus, setSearchStatus] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isGpsLoading, setIsGpsLoading] = useState(false);

  const handleOpenModal = () => {
    setIsModalOpen(true);
    setSearchInput('');
    setSearchResults([]);
    setSearchStatus('');
  };

  const handleSelectLocation = async (loc) => {
    setIsSearching(true);
    setSearchStatus(`Connecting to satellite radar for ${loc.name}...`);
    try {
      await onLocationChange(loc);
      setIsModalOpen(false);
    } catch (err) {
      setSearchStatus('Failed to sync location. Please try again.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearch = async (e) => {
    if (e) e.preventDefault();
    if (!searchInput.trim()) return;

    setIsSearching(true);
    setSearchStatus(`Searching for "${searchInput}"...`);
    setSearchResults([]);

    try {
      const results = await geocodeLocation(searchInput.trim());
      if (Array.isArray(results) && results.length > 0) {
        setSearchResults(results.slice(0, 5));
        setSearchStatus(`Found ${results.length} matching area(s). Click one to apply:`);
      } else {
        setSearchStatus(`No exact match found for "${searchInput}". Try another town or district.`);
      }
    } catch (err) {
      setSearchStatus('Geocoding service unavailable. Please try again.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleDetectDeviceGps = () => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setSearchStatus('GPS hardware access is not supported by this browser.');
      return;
    }

    setIsGpsLoading(true);
    setSearchStatus('Acquiring high-accuracy device GPS coordinates...');

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = parseFloat(pos.coords.latitude.toFixed(4));
        const lng = parseFloat(pos.coords.longitude.toFixed(4));
        let placeName = `My GPS Location (${lat}, ${lng})`;

        try {
          const rev = await reverseGeocodeCoords(lat, lng);
          if (rev && rev.name) placeName = rev.name;
        } catch (e) {}

        await handleSelectLocation({
          name: placeName,
          country: '',
          lat,
          lng
        });
        setIsGpsLoading(false);
      },
      async (err) => {
        console.warn('GPS query failed:', err.message);
        setSearchStatus(`Could not acquire device GPS (${err.message}). Trying ISP network fallback...`);
        try {
          const ipLoc = await fetchIpLocation();
          if (ipLoc) {
            await handleSelectLocation(ipLoc);
            setIsGpsLoading(false);
            return;
          }
        } catch (e) {}
        setSearchStatus('GPS and network location unavailable. Please type your town name above.');
        setIsGpsLoading(false);
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
    );
  };

  const displayLocName = activeLocation?.name || 'Assam, India';
  const latStr = activeLocation?.lat !== undefined ? `${Number(activeLocation.lat).toFixed(3)}° N` : '';
  const lngStr = activeLocation?.lng !== undefined ? `${Number(activeLocation.lng).toFixed(3)}° E` : '';

  return (
    <>
      {/* PERSISTENT TOP TRANSPARENCY BAR */}
      <section
        style={{
          background: 'linear-gradient(90deg, rgba(8, 17, 34, 0.96) 0%, rgba(13, 27, 49, 0.94) 100%)',
          borderBottom: '1px solid rgba(56, 189, 248, 0.22)',
          padding: '10px 24px',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.4)',
          position: 'relative',
          zIndex: 30
        }}
      >
        {/* Left: Active Location Identification & Honest Telemetry Status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          {(() => {
            const status = (prediction?.status || params?.status || 'LIVE').toUpperCase();
            const isSimulated = status === 'SIMULATED';
            const isDelayed = status === 'DELAYED';
            const isUnavailable = status === 'UNAVAILABLE';

            const badgeBg = isSimulated
              ? 'rgba(245, 158, 11, 0.16)'
              : isUnavailable
              ? 'rgba(239, 68, 68, 0.16)'
              : isDelayed
              ? 'rgba(234, 179, 8, 0.16)'
              : 'rgba(16, 185, 129, 0.14)';

            const badgeBorder = isSimulated
              ? 'rgba(245, 158, 11, 0.45)'
              : isUnavailable
              ? 'rgba(239, 68, 68, 0.45)'
              : isDelayed
              ? 'rgba(234, 179, 8, 0.45)'
              : 'rgba(16, 185, 129, 0.35)';

            const badgeColor = isSimulated
              ? '#fbbf24'
              : isUnavailable
              ? '#fca5a5'
              : isDelayed
              ? '#fde047'
              : '#34d399';

            const dotColor = isSimulated
              ? '#f59e0b'
              : isUnavailable
              ? '#ef4444'
              : isDelayed
              ? '#eab308'
              : '#10b981';

            const labelText = isSimulated
              ? 'SIMULATED / OFFLINE BASELINE'
              : isUnavailable
              ? 'TELEMETRY UNAVAILABLE'
              : isDelayed
              ? 'DELAYED TELEMETRY'
              : 'LIVE TELEMETRY (Open-Meteo)';

            return (
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                background: badgeBg,
                border: `1px solid ${badgeBorder}`,
                borderRadius: '999px',
                padding: '3px 10px',
                fontSize: '0.72rem',
                color: badgeColor,
                fontWeight: 800,
                letterSpacing: '0.02em'
              }}
              title={isSimulated ? "Real-time API was unreachable; baseline simulation parameters loaded." : "Data streaming from live Open-Meteo NWP & Copernicus DEM."}
              >
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: dotColor, display: 'inline-block' }} />
                <span>{labelText}</span>
              </div>
            );
          })()}

          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ color: '#94a3b8', fontSize: '0.8rem', fontWeight: 500 }}>
              Monitoring:
            </span>
            <span style={{ color: '#f8fafc', fontSize: '0.92rem', fontWeight: 800, letterSpacing: '0.2px' }}>
              📍 {displayLocName}
            </span>
            {(latStr || lngStr) && (
              <span style={{
                color: '#38bdf8',
                fontSize: '0.75rem',
                fontFamily: 'JetBrains Mono, monospace',
                background: 'rgba(56, 189, 248, 0.1)',
                padding: '2px 6px',
                borderRadius: '4px',
                border: '1px solid rgba(56, 189, 248, 0.2)'
              }}>
                {latStr}, {lngStr}
              </span>
            )}
          </div>

          {/* Environmental Telemetry & Physical Depth Readings */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{
              fontSize: '0.72rem',
              color: '#cbd5e1',
              background: 'rgba(255, 255, 255, 0.05)',
              padding: '2px 8px',
              borderRadius: '6px',
              border: '1px solid rgba(255, 255, 255, 0.1)'
            }}>
              🌧️ Rain 24h: <strong style={{ color: '#38bdf8' }}>{params?.rainfall24h ?? 0} mm</strong>
            </span>
            <span style={{
              fontSize: '0.72rem',
              color: '#cbd5e1',
              background: 'rgba(255, 255, 255, 0.05)',
              padding: '2px 8px',
              borderRadius: '6px',
              border: '1px solid rgba(255, 255, 255, 0.1)'
            }}>
              ⛰️ Elev: <strong style={{ color: '#a3e635' }}>{params?.elevation ?? 0} m</strong>
            </span>
            <span style={{
              fontSize: '0.72rem',
              color: '#cbd5e1',
              background: 'rgba(255, 255, 255, 0.05)',
              padding: '2px 8px',
              borderRadius: '6px',
              border: '1px solid rgba(255, 255, 255, 0.1)'
            }}>
              🌊 Inundation Depth: <strong style={{ color: (prediction?.inundationDepthMeters || 0) >= 0.45 ? '#ef4444' : ((prediction?.inundationDepthMeters || 0) >= 0.15 ? '#f59e0b' : '#38bdf8') }}>
                {prediction?.inundationDepthMeters !== undefined ? `${prediction.inundationDepthMeters} m` : '0.00 m'}
              </strong>
            </span>
            {prediction?.depthTier && (
              <span style={{
                fontSize: '0.68rem',
                color: (prediction?.inundationDepthMeters || 0) >= 0.45 ? '#fca5a5' : ((prediction?.inundationDepthMeters || 0) >= 0.15 ? '#fde68a' : '#94a3b8'),
                background: 'rgba(0, 0, 0, 0.3)',
                padding: '2px 7px',
                borderRadius: '5px',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                fontWeight: 600
              }}>
                {prediction.depthTier}
              </span>
            )}
            {prediction?.missingMeasurements && prediction.missingMeasurements.length > 0 && (
              <span style={{
                fontSize: '0.68rem',
                color: '#f59e0b',
                background: 'rgba(245, 158, 11, 0.12)',
                padding: '2px 7px',
                borderRadius: '5px',
                border: '1px solid rgba(245, 158, 11, 0.3)',
                fontWeight: 600
              }}
              title={`Missing measurements: ${prediction.missingMeasurements.join(', ')}`}
              >
                ⚠️ {prediction.missingMeasurements.length} Missing Sensor(s) Defaulted
              </span>
            )}
          </div>
        </div>

      </section>

      {/* MODAL: SELECT OR SEARCH YOUR EXACT TOWN */}
      {isModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '16px'
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsModalOpen(false);
          }}
        >
          <div
            style={{
              background: '#090f1f',
              border: '1px solid rgba(56, 189, 248, 0.35)',
              borderRadius: '16px',
              width: '100%',
              maxWidth: '560px',
              padding: '24px',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.8), 0 0 30px rgba(56, 189, 248, 0.15)',
              color: '#f8fafc'
            }}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#f8fafc' }}>
                  Select Your City or Town
                </h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: '#94a3b8' }}>
                  Ingest real-time Open-Meteo satellite rainfall and Copernicus DEM elevation for your exact location.
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#94a3b8',
                  fontSize: '1.4rem',
                  cursor: 'pointer',
                  padding: '0 4px',
                  lineHeight: 1
                }}
              >
                ×
              </button>
            </div>

            {/* Search Input Bar */}
            <form onSubmit={handleSearch} style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
              <input
                type="text"
                autoFocus
                placeholder="Type your town (e.g., Kharupetia, Guwahati, Mumbai, Delhi)..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                style={{
                  flex: 1,
                  background: '#040711',
                  border: '1px solid #1e293b',
                  borderRadius: '10px',
                  padding: '12px 16px',
                  color: '#f8fafc',
                  fontSize: '0.9rem',
                  outline: 'none',
                  boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.5)'
                }}
              />
              <button
                type="submit"
                disabled={isSearching}
                style={{
                  background: '#0284c7',
                  border: 'none',
                  color: '#ffffff',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  padding: '0 20px',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(2, 132, 199, 0.4)'
                }}
              >
                {isSearching ? 'Searching...' : 'Search'}
              </button>
            </form>

            {/* Search Feedback */}
            {searchStatus && (
              <div style={{
                fontSize: '0.78rem',
                color: searchStatus.includes('No') ? '#f87171' : '#38bdf8',
                marginBottom: '14px',
                padding: '6px 10px',
                background: 'rgba(255, 255, 255, 0.03)',
                borderRadius: '6px'
              }}>
                {searchStatus}
              </div>
            )}

            {/* Dynamic Search Results */}
            {searchResults.length > 0 && (
              <div style={{
                maxHeight: '180px',
                overflowY: 'auto',
                marginBottom: '16px',
                border: '1px solid rgba(56, 189, 248, 0.25)',
                borderRadius: '8px',
                background: '#040711'
              }}>
                {searchResults.map((item, idx) => (
                  <div
                    key={idx}
                    onClick={() => handleSelectLocation({
                      name: item.name,
                      country: item.country || '',
                      lat: item.lat,
                      lng: item.lng
                    })}
                    style={{
                      padding: '10px 14px',
                      borderBottom: idx < searchResults.length - 1 ? '1px solid rgba(255, 255, 255, 0.06)' : 'none',
                      cursor: 'pointer',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      transition: 'background 0.15s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(56, 189, 248, 0.1)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <div>
                      <div style={{ fontSize: '0.86rem', fontWeight: 700, color: '#f8fafc' }}>
                        📍 {item.name}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                        {item.country || 'Region'}
                      </div>
                    </div>
                    <span style={{ fontSize: '0.72rem', color: '#38bdf8', fontFamily: 'JetBrains Mono, monospace' }}>
                      {Number(item.lat).toFixed(3)}°, {Number(item.lng).toFixed(3)}°
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Device GPS Instant Button */}
            <div style={{
              background: 'rgba(16, 185, 129, 0.08)',
              border: '1px solid rgba(16, 185, 129, 0.25)',
              borderRadius: '10px',
              padding: '12px 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '18px'
            }}>
              <div>
                <div style={{ fontSize: '0.84rem', fontWeight: 700, color: '#34d399' }}>
                  🎯 Use Phone / Device GPS
                </div>
                <div style={{ fontSize: '0.74rem', color: '#94a3b8' }}>
                  Captures exact satellite coordinates on mobile phones or Wi-Fi location on laptops.
                </div>
              </div>
              <button
                onClick={handleDetectDeviceGps}
                disabled={isGpsLoading}
                style={{
                  background: '#10b981',
                  color: '#ffffff',
                  border: 'none',
                  padding: '8px 14px',
                  borderRadius: '8px',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap'
                }}
              >
                {isGpsLoading ? 'Acquiring...' : 'Detect GPS'}
              </button>
            </div>

            {/* Popular Flood Monitoring Hotspots */}
            <div>
              <div style={{ fontSize: '0.74rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
                Monitored Flood Catchments:
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '8px' }}>
                {POPULAR_LOCATIONS.map((loc) => (
                  <button
                    key={loc.name}
                    onClick={() => handleSelectLocation(loc)}
                    style={{
                      background: 'rgba(255, 255, 255, 0.04)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '8px',
                      padding: '8px 10px',
                      textAlign: 'left',
                      cursor: 'pointer',
                      transition: 'all 0.15s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(56, 189, 248, 0.12)';
                      e.currentTarget.style.borderColor = '#38bdf8';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
                      e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                    }}
                  >
                    <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#f8fafc' }}>
                      📍 {loc.name.split(',')[0]}
                    </div>
                    <div style={{ fontSize: '0.68rem', color: '#38bdf8' }}>
                      {loc.badge}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
