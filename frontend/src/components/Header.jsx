import React, { useState, useEffect, useRef } from 'react';
import { geocodeLocation, reverseGeocodeCoords } from '../services/api';

export default function Header({
  onToggleSidebar,
  isSidebarHidden = false,
  onOpenAlerts,
  onOpenProfile,
  onDownloadApp,
  activeLocation,
  homeLocation,
  locationTab = 'myLocation',
  onSwitchToMyLocation,
  onSwitchToExplore,
  isFetchingRealTelemetry,
  onLocationChange
}) {
  const [time, setTime] = useState('');
  const [date, setDate] = useState('');
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [showLocPicker, setShowLocPicker] = useState(false);
  const [locInput, setLocInput] = useState('');
  const [locStatus, setLocStatus] = useState('');
  const [isLocLoading, setIsLocLoading] = useState(false);
  const locPickerRef = useRef(null);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const updateTime = () => {
      const now = new Date();
      setTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }));
      setDate(now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }));
    };

    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => {
      clearInterval(timer);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Close picker on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (locPickerRef.current && !locPickerRef.current.contains(e.target)) {
        setShowLocPicker(false);
      }
    };
    if (showLocPicker) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showLocPicker]);

  const handleApplyLocation = async (locObj) => {
    if (!onLocationChange) return;
    setIsLocLoading(true);
    setLocStatus(`Syncing ${locObj.name}...`);
    try {
      await onLocationChange(locObj);
      setShowLocPicker(false);
      setLocInput('');
      setLocStatus('');
    } catch (e) {
      setLocStatus('Sync failed');
    } finally {
      setIsLocLoading(false);
    }
  };

  const handleSearchSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!locInput.trim()) return;
    setIsLocLoading(true);
    setLocStatus('Searching location...');
    try {
      const results = await geocodeLocation(locInput.trim());
      if (results && results.length > 0) {
        const top = results[0];
        await handleApplyLocation({
          name: top.name,
          country: top.country || '',
          lat: top.lat,
          lng: top.lng
        });
      } else {
        setLocStatus('Location not found. Try another city.');
      }
    } catch (err) {
      setLocStatus('Search error');
    } finally {
      setIsLocLoading(false);
    }
  };

  const handleDetectGps = () => {
    if (!navigator.geolocation) {
      setLocStatus('GPS not supported');
      return;
    }
    setIsLocLoading(true);
    setLocStatus('Acquiring device GPS...');
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = parseFloat(pos.coords.latitude.toFixed(4));
        const lng = parseFloat(pos.coords.longitude.toFixed(4));
        let placeName = `Device Location (${lat}, ${lng})`;
        try {
          const rev = await reverseGeocodeCoords(lat, lng);
          if (rev && rev.name) placeName = rev.name;
        } catch (e) {}
        await handleApplyLocation({ name: placeName, country: '', lat, lng });
      },
      async (err) => {
        setLocStatus('GPS failed, trying IP...');
        try {
          const ipLoc = await fetchIpLocation();
          if (ipLoc) {
            await handleApplyLocation(ipLoc);
            return;
          }
        } catch (e) {}
        setLocStatus('Unable to acquire GPS');
        setIsLocLoading(false);
      },
      { enableHighAccuracy: true, timeout: 6000, maximumAge: 0 }
    );
  };

  const handleDetectIp = async () => {
    setIsLocLoading(true);
    setLocStatus('Detecting network IP location...');
    try {
      const ipLoc = await fetchIpLocation();
      if (ipLoc) {
        await handleApplyLocation(ipLoc);
        return;
      }
      setLocStatus('IP detection failed');
    } catch (e) {
      setLocStatus('Network error');
    } finally {
      setIsLocLoading(false);
    }
  };

  return (
    <header className="top-header" style={{ background: 'rgba(8, 12, 22, 0.85)', backdropFilter: 'blur(16px)', borderBottom: '1px solid rgba(56, 189, 248, 0.15)' }}>
      <div className="header-left" style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <button
          className="menu-toggle-btn"
          onClick={onToggleSidebar}
          aria-label="Toggle navigation sidebar"
          title={isSidebarHidden ? 'Show Navigation Sidebar' : 'Hide / Toggle Navigation Sidebar'}
          style={{
            background: isSidebarHidden ? 'rgba(2, 132, 199, 0.25)' : 'rgba(30, 41, 59, 0.6)',
            border: isSidebarHidden ? '1px solid #38bdf8' : '1px solid rgba(56, 189, 248, 0.25)',
            color: '#38bdf8',
            borderRadius: '8px',
            padding: '6px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.15s ease'
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="4" x2="20" y1="12" y2="12"/>
            <line x1="4" x2="20" y1="6" y2="6"/>
            <line x1="4" x2="20" y1="18" y2="18"/>
          </svg>
        </button>
        <div className="header-titles">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h1 style={{ fontSize: '1.25rem', fontWeight: 800, letterSpacing: '-0.02em', margin: 0, color: '#f8fafc' }}>
              DisasterRadar<span style={{ color: '#38bdf8' }}>.ai</span>
            </h1>
            <span style={{ fontSize: '0.62rem', fontWeight: 700, padding: '2px 6px', borderRadius: '4px', background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', border: '1px solid rgba(56, 189, 248, 0.3)', letterSpacing: '0.04em' }}>
              EOC-v2.5
            </span>
          </div>
          <p style={{ fontSize: '0.72rem', color: '#94a3b8', margin: 0 }}>
            AI Flood Risk Prediction & Disaster Intelligence
          </p>
        </div>
      </div>

      <div className="header-right" style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
        {/* Sleek 2-Tab Location Switcher: My Location vs Explore Other Location */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            background: 'rgba(15, 23, 42, 0.9)',
            border: '1px solid rgba(56, 189, 248, 0.3)',
            borderRadius: '22px',
            padding: '3px',
            gap: '4px'
          }}
        >
          <button
            type="button"
            onClick={onSwitchToMyLocation}
            style={{
              background: locationTab === 'myLocation' ? '#0284c7' : 'transparent',
              color: locationTab === 'myLocation' ? '#ffffff' : '#94a3b8',
              border: 'none',
              borderRadius: '18px',
              padding: '4px 12px',
              fontSize: '0.72rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              boxShadow: locationTab === 'myLocation' ? '0 2px 8px rgba(2, 132, 199, 0.4)' : 'none',
              transition: 'all 0.15s'
            }}
            title={`Your Home Location: ${homeLocation?.name || 'Kharupetia, Assam'}`}
          >
            <span>🏠</span>
            <span>My Location ({homeLocation?.name?.split(',')[0] || 'Kharupetia'})</span>
          </button>

          <button
            type="button"
            onClick={() => onSwitchToExplore && onSwitchToExplore()}
            style={{
              background: locationTab === 'explore' ? '#0284c7' : 'transparent',
              color: locationTab === 'explore' ? '#ffffff' : '#94a3b8',
              border: 'none',
              borderRadius: '18px',
              padding: '4px 12px',
              fontSize: '0.72rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              boxShadow: locationTab === 'explore' ? '0 2px 8px rgba(2, 132, 199, 0.4)' : 'none',
              transition: 'all 0.15s'
            }}
            title="Inspect other cities/regions without altering your home location"
          >
            <span>🔍</span>
            <span>{locationTab === 'explore' ? `Exploring (${activeLocation?.name?.split(',')[0]})` : 'Other Location'}</span>
          </button>

          {locationTab === 'explore' && onSwitchToMyLocation && (
            <button
              type="button"
              onClick={onSwitchToMyLocation}
              style={{
                background: 'rgba(16, 185, 129, 0.2)',
                border: '1px solid #10b981',
                color: '#34d399',
                borderRadius: '14px',
                padding: '3px 8px',
                fontSize: '0.66rem',
                fontWeight: 700,
                cursor: 'pointer',
                marginLeft: '2px'
              }}
              title="Return to your Home Location"
            >
              ↩️ Home
            </button>
          )}

          {isFetchingRealTelemetry && (
            <span style={{ fontSize: '0.66rem', color: '#f59e0b', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '3px', padding: '0 6px' }}>
              <span className="live-pulsing-dot" style={{ width: '5px', height: '5px', background: '#f59e0b' }} />
              Live...
            </span>
          )}
        </div>
        {/* Live Satellite Ingestion / Offline Telemetry Status Badge */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: isOnline ? 'rgba(15, 23, 42, 0.75)' : 'rgba(124, 45, 18, 0.75)',
            border: `1px solid ${isOnline ? 'rgba(56, 189, 248, 0.2)' : '#f97316'}`,
            borderRadius: '20px',
            padding: '4px 10px',
            fontSize: '0.68rem',
            color: isOnline ? '#cbd5e1' : '#fed7aa',
            fontWeight: 700
          }}
        >
          <span
            style={{
              width: '7px',
              height: '7px',
              borderRadius: '50%',
              backgroundColor: isOnline ? '#10b981' : '#f97316',
              boxShadow: `0 0 8px ${isOnline ? '#10b981' : '#f97316'}`,
              display: 'inline-block'
            }}
          />
          <span>{isOnline ? 'OPEN-METEO LIVE' : 'OFFLINE RESCUE MODE'}</span>
        </div>

        {/* EOC Mission Clock */}
        <div className="header-clock" style={{ display: 'flex', alignItems: 'center', gap: '8px', borderLeft: '1px solid rgba(255, 255, 255, 0.1)', paddingLeft: '14px' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/>
            <polyline points="12 6 12 12 16 14"/>
          </svg>
          <div className="clock-details">
            <span className="clock-time" style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.86rem', fontWeight: 700, color: '#f8fafc' }}>
              {time || '10:24:00 AM'}
            </span>
            <span className="clock-date" style={{ fontSize: '0.68rem', color: '#64748b' }}>
              {date}
            </span>
          </div>
        </div>

        <div className="header-actions" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Prominent Download App Button for PC & Mobile */}
          <button
            className="download-app-header-btn"
            onClick={onDownloadApp}
            aria-label="Download App"
            style={{
              background: '#0284c7',
              border: '1px solid #38bdf8',
              borderRadius: '6px',
              padding: '6px 12px',
              cursor: 'pointer',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.74rem',
              fontWeight: 700
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            <span>Download App</span>
          </button>

          <button
            className="icon-button"
            onClick={onOpenAlerts}
            aria-label="Notifications"
            style={{
              background: 'rgba(30, 41, 59, 0.5)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '8px',
              padding: '6px',
              cursor: 'pointer',
              color: '#e2e8f0',
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/>
              <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>
            </svg>
            <span className="badge-dot" style={{ position: 'absolute', top: '4px', right: '4px', width: '6px', height: '6px', backgroundColor: '#ef4444', borderRadius: '50%', boxShadow: '0 0 6px #ef4444' }} />
          </button>

          <button
            className="user-avatar-btn"
            onClick={onOpenProfile}
            aria-label="User Profile"
            style={{
              background: 'rgba(30, 41, 59, 0.5)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '8px',
              padding: '6px',
              cursor: 'pointer',
              color: '#e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
          </button>
        </div>
      </div>
    </header>
  );
}
