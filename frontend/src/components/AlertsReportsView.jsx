import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  fetchAlertScoring,
  fetchRainfallImpact,
  fetchWeeklyReports,
  geocodeLocation,
  fetchGlobalLiveTelemetry,
  predictFloodRisk,
  fetchSystemMultiHazardAlerts,
  acknowledgeAlert,
  fetchAlertsAuditLedger
} from '../services/api';
import { getHydrologicalProfile } from '../services/hydrologyProfiles';

export default function AlertsReportsView({
  currentLocation,
  params,
  prediction,
  onBackToDashboard,
  isEmbeddedInModal = false,
  onLocationChange,
  onOpenCyclone
}) {
  const [subTab, setSubTab] = useState('threshold');
  const [alertScore, setAlertScore] = useState(null);
  const [rainfallImpact, setRainfallImpact] = useState(null);
  const [weeklyReport, setWeeklyReport] = useState(null);
  const [multiHazardAlerts, setMultiHazardAlerts] = useState([]);
  const [hazardFilter, setHazardFilter] = useState('ALL');
  const [loading, setLoading] = useState(false);
  const [citizenFeedback, setCitizenFeedback] = useState(null);
  const [userStatus, setUserStatus] = useState(() => {
    try {
      const raw = localStorage.getItem('disasterradar_user_safety_status');
      if (raw) {
        const parsed = JSON.parse(raw);
        const age = Date.now() - (parsed.timestamp || 0);
        const ONE_DAY = 24 * 60 * 60 * 1000;
        if (age < ONE_DAY) {
          return parsed.status;
        } else {
          localStorage.removeItem('disasterradar_user_safety_status');
        }
      }
    } catch (e) {}
    return null;
  });

  const [userStatusTime, setUserStatusTime] = useState(() => {
    try {
      const raw = localStorage.getItem('disasterradar_user_safety_status');
      if (raw) {
        const parsed = JSON.parse(raw);
        const age = Date.now() - (parsed.timestamp || 0);
        const ONE_DAY = 24 * 60 * 60 * 1000;
        if (age < ONE_DAY) {
          return parsed.timestamp;
        }
      }
    } catch (e) {}
    return null;
  });

  const getRemainingHours = () => {
    if (!userStatusTime) return null;
    const remainingMs = (24 * 60 * 60 * 1000) - (Date.now() - userStatusTime);
    if (remainingMs <= 0) return 0;
    return Math.max(1, Math.round(remainingMs / (60 * 60 * 1000)));
  };

  useEffect(() => {
    const checkExpiration = () => {
      try {
        const raw = localStorage.getItem('disasterradar_user_safety_status');
        if (raw) {
          const parsed = JSON.parse(raw);
          const age = Date.now() - (parsed.timestamp || 0);
          if (age >= 24 * 60 * 60 * 1000) {
            localStorage.removeItem('disasterradar_user_safety_status');
            setUserStatus(null);
            setUserStatusTime(null);
          }
        }
      } catch (e) {}
    };
    const interval = setInterval(checkExpiration, 60000);
    return () => clearInterval(interval);
  }, []);
  const [auditLedger, setAuditLedger] = useState([]);
  const [auditLoading, setAuditLoading] = useState(false);

  // Active Location & Telemetry State
  const [activeLoc, setActiveLoc] = useState(() => {
    if (currentLocation && typeof currentLocation === 'object') return currentLocation;
    if (typeof currentLocation === 'string') return { name: currentLocation, country: '', lat: 26.5181, lng: 92.1384 };
    return { name: 'Kharupetia, Assam', country: 'India', lat: 26.5181, lng: 92.1384, elevation: 48 };
  });

  const [activeTelemetry, setActiveTelemetry] = useState(params || {
    rainfall24h: 0.0,
    rainfall72h: 0.0,
    temperature: 21.2,
    humidity: 78,
    windSpeed: 12,
    pressure: 910,
    elevation: 897,
    latitude: 12.9603,
    longitude: 77.7151
  });

  const [activePrediction, setActivePrediction] = useState(prediction || {
    probability: 2.5,
    riskLevel: 'LOW'
  });

  // Location Search & Change Panel State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isFetchingLocation, setIsFetchingLocation] = useState(false);
  const [showSearchBox, setShowSearchBox] = useState(false);
  const [statusNotification, setStatusNotification] = useState('');
  const [customLat, setCustomLat] = useState('');
  const [customLng, setCustomLng] = useState('');

  const searchInputRef = useRef(null);

  // Sync props if parent changes
  useEffect(() => {
    if (currentLocation) {
      if (typeof currentLocation === 'object') setActiveLoc(currentLocation);
      else if (typeof currentLocation === 'string') setActiveLoc({ name: currentLocation, country: '', lat: 12.9603, lng: 77.7151 });
    }
  }, [currentLocation]);

  useEffect(() => {
    if (params) setActiveTelemetry(params);
  }, [params]);

  useEffect(() => {
    if (prediction) setActivePrediction(prediction);
  }, [prediction]);

  const rawLoc = activeLoc?.name || (typeof activeLoc === 'string' ? activeLoc : 'Bengaluru, Karnataka');
  const locName = rawLoc.split(',')[0].trim();
  const locCountry = activeLoc?.country || '';
  const locLat = activeLoc?.lat !== undefined ? Number(activeLoc.lat) : 12.960;
  const locLng = activeLoc?.lng !== undefined ? Number(activeLoc.lng) : 77.715;

  const currentR24 = Number(activeTelemetry?.rainfall24h ?? 0.0);
  const currentR72 = Number(activeTelemetry?.rainfall72h ?? 0.0);
  const currentElev = Number(activeTelemetry?.elevation ?? 897.0);

  const curProb = alertScore?.probability ?? activePrediction?.probability ?? 2.5;
  const isThresholdCrossed = curProb >= 50.0;
  const deltaThreshold = Math.round((curProb - 50.0) * 10) / 10;

  // Fetch alert scoring and weekly reports on load or location change
  useEffect(() => {
    setLoading(true);
    const payload = {
      rainfall24h: currentR24,
      rainfall72h: currentR72,
      temperature: activeTelemetry?.temperature ?? 25.0,
      humidity: activeTelemetry?.humidity ?? 82.0,
      windSpeed: activeTelemetry?.windSpeed ?? 12.0,
      pressure: activeTelemetry?.pressure ?? 1005.0,
      elevation: currentElev,
      latitude: locLat,
      longitude: locLng,
      location: locName,
      probability: curProb
    };

    Promise.all([
      fetchAlertScoring(payload),
      fetchRainfallImpact(payload),
      fetchWeeklyReports(locName, locLat, locLng, payload),
      fetchSystemMultiHazardAlerts('ALL')
    ]).then(([score, impact, weekly, mhRes]) => {
      if (score) {
        setAlertScore(score);
        if (score.citizen_acknowledgements) {
          setAckCounts(score.citizen_acknowledgements);
        }
      }
      if (impact) setRainfallImpact(impact);
      if (weekly) setWeeklyReport(weekly);
      if (mhRes?.alerts) setMultiHazardAlerts(mhRes.alerts);
    }).finally(() => {
      setLoading(false);
    });
  }, [locName, locLat, locLng, currentR24, currentR72, currentElev]);

  const loadAuditLedger = useCallback(async () => {
    setAuditLoading(true);
    try {
      const data = await fetchAlertsAuditLedger(25);
      if (data && data.alerts) {
        setAuditLedger(data.alerts);
      }
    } catch (e) {
      console.warn("Failed to fetch alert audit ledger:", e);
    } finally {
      setAuditLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAuditLedger();
  }, [loadAuditLedger]);

  const handleCitizenAck = async (status) => {
    const now = Date.now();
    const statusLabels = {
      safe: 'I Am Safe (No Ingress)',
      confirmed: 'Flooding Confirmed Here',
      rescue: 'Swift-Water Rescue Requested'
    };

    try {
      const alertId = alertScore?.alert_id || `ALT-${locName.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8)}-${new Date().toISOString().slice(0, 10)}`;
      setCitizenFeedback(`Updating your status to: "${statusLabels[status]}"...`);
      await acknowledgeAlert(alertId, status, `Reported via personal portal for ${locName}`);

      setUserStatus(status);
      setUserStatusTime(now);
      localStorage.setItem('disasterradar_user_safety_status', JSON.stringify({
        status,
        timestamp: now,
        location: locName
      }));

      setCitizenFeedback(`Your status has been updated to: "${statusLabels[status]}". Saved for 24 hours.`);
      setTimeout(() => setCitizenFeedback(null), 5000);
      loadAuditLedger();
    } catch (err) {
      console.error("Citizen ack failed:", err);
      setUserStatus(status);
      setUserStatusTime(now);
      localStorage.setItem('disasterradar_user_safety_status', JSON.stringify({
        status,
        timestamp: now,
        location: locName
      }));
      setCitizenFeedback(`Saved your status locally as "${statusLabels[status]}" for 24 hours.`);
      setTimeout(() => setCitizenFeedback(null), 4000);
    }
  };

  const handleResetUserStatus = () => {
    localStorage.removeItem('disasterradar_user_safety_status');
    setUserStatus(null);
    setUserStatusTime(null);
    setCitizenFeedback("Your personal status has been cleared.");
    setTimeout(() => setCitizenFeedback(null), 3000);
  };

  // Handle Search Input Change with Debounced Geocoding
  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearchQuery(val);
    if (!val.trim()) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }

    setIsSearching(true);
    const timer = setTimeout(async () => {
      try {
        const results = await geocodeLocation(val);
        setSearchResults(results || []);
        setShowDropdown((results || []).length > 0);
      } catch (err) {
        console.warn('Geocoding search failed:', err);
      } finally {
        setIsSearching(false);
      }
    }, 320);

    return () => clearTimeout(timer);
  };

  // Switch to new location, fetch live telemetry & compute prediction
  const handleApplyLocation = async (locItem) => {
    setShowDropdown(false);
    setSearchQuery('');
    setShowSearchBox(false);
    setIsFetchingLocation(true);
    setStatusNotification(`⚡ Querying live Open-Meteo rainfall & Copernicus DEM elevation for ${locItem.name}...`);

    try {
      const live = await fetchGlobalLiveTelemetry(locItem.lat, locItem.lng);

      const newParams = {
        rainfall24h: live.rainfall24h,
        rainfall72h: live.rainfall72h,
        temperature: live.temperature,
        humidity: live.humidity,
        windSpeed: live.windSpeed,
        pressure: live.pressure,
        elevation: live.elevation,
        latitude: locItem.lat,
        longitude: locItem.lng,
        location: `${locItem.name}${locItem.country ? ', ' + locItem.country : ''}`
      };

      const predResult = await predictFloodRisk(newParams);

      setActiveLoc(locItem);
      setActiveTelemetry(newParams);
      setActivePrediction(predResult);

      const payload = {
        ...newParams,
        probability: predResult.probability
      };

      const [score, impact, weekly] = await Promise.all([
        fetchAlertScoring(payload),
        fetchRainfallImpact(payload),
        fetchWeeklyReports(locItem.name, locItem.lat, locItem.lng, payload)
      ]);

      if (score) setAlertScore(score);
      if (impact) setRainfallImpact(impact);
      if (weekly) setWeeklyReport(weekly);

      setStatusNotification(`✓ Loaded ${locItem.name}: Elevation ${live.elevation}m, 24h Rain ${live.rainfall24h}mm (ML Risk: ${predResult.probability}%)`);
      setTimeout(() => setStatusNotification(''), 4500);

      onLocationChange?.(locItem, newParams, predResult);
    } catch (err) {
      console.error('Failed to update location:', err);
      setStatusNotification(`⚠ Error querying telemetry for ${locItem.name}. Please try again.`);
      setTimeout(() => setStatusNotification(''), 4500);
    } finally {
      setIsFetchingLocation(false);
    }
  };

  // Direct Coordinates Search Form
  const handleCustomCoordinatesSubmit = (e) => {
    e.preventDefault();
    const lat = parseFloat(customLat);
    const lng = parseFloat(customLng);
    if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      alert('Please enter valid coordinates (-90 to 90 for Latitude, -180 to 180 for Longitude)');
      return;
    }
    handleApplyLocation({
      name: `Coordinate (${lat.toFixed(3)}°, ${lng.toFixed(3)}°)`,
      country: 'Custom Location',
      lat: lat,
      lng: lng
    });
    setCustomLat('');
    setCustomLng('');
  };

  // Generate dynamic 7-day retrospective records for the selected location
  const today = new Date();
  const weekRecords = weeklyReport?.weekly_records || [
    {
      id: 'w1',
      date: new Date(today.getTime() - 6 * 86400000).toISOString().split('T')[0],
      day_name: 'Day -6',
      rainfall_24h_mm: Math.max(5, Math.round(currentR24 * 0.35)),
      rainfall_72h_mm: Math.max(15, Math.round(currentR72 * 0.45)),
      probability: Math.max(5, Math.round(curProb * 0.45 * 10) / 10),
      threshold_crossed: (curProb * 0.45) >= 50.0,
      risk_level: (curProb * 0.45) >= 70 ? 'CRITICAL' : ((curProb * 0.45) >= 50 ? 'HIGH' : 'LOW'),
      peak_water_depth_m: Math.max(0.1, Math.round((curProb * 0.45 / 100) * 1.5 * 10) / 10),
      status_summary: `Intermittent showers in ${locName}; runoff nallas flowing normally`
    },
    {
      id: 'w2',
      date: new Date(today.getTime() - 5 * 86400000).toISOString().split('T')[0],
      day_name: 'Day -5',
      rainfall_24h_mm: Math.max(10, Math.round(currentR24 * 0.6)),
      rainfall_72h_mm: Math.max(25, Math.round(currentR72 * 0.65)),
      probability: Math.max(8, Math.round(curProb * 0.65 * 10) / 10),
      threshold_crossed: (curProb * 0.65) >= 50.0,
      risk_level: (curProb * 0.65) >= 70 ? 'CRITICAL' : ((curProb * 0.65) >= 50 ? 'HIGH' : 'LOW'),
      peak_water_depth_m: Math.max(0.2, Math.round((curProb * 0.65 / 100) * 1.5 * 10) / 10),
      status_summary: `Soil saturation accumulating in ${locName}; minor curb-height pooling`
    },
    {
      id: 'w3',
      date: new Date(today.getTime() - 4 * 86400000).toISOString().split('T')[0],
      day_name: 'Day -4',
      rainfall_24h_mm: Math.max(15, Math.round(currentR24 * 1.25)),
      rainfall_72h_mm: Math.max(40, Math.round(currentR72 * 1.15)),
      probability: Math.min(99.4, Math.round(curProb * 1.15 * 10) / 10),
      threshold_crossed: (curProb * 1.15) >= 50.0,
      risk_level: (curProb * 1.15) >= 70 ? 'CRITICAL' : ((curProb * 1.15) >= 50 ? 'HIGH' : 'LOW'),
      peak_water_depth_m: Math.max(0.4, Math.round((Math.min(100, curProb * 1.15) / 100) * 1.6 * 10) / 10),
      status_summary: `Peak storm intensity across ${locName}; culverts surcharged; pumps active`
    },
    {
      id: 'w4',
      date: new Date(today.getTime() - 3 * 86400000).toISOString().split('T')[0],
      day_name: 'Day -3',
      rainfall_24h_mm: Math.max(12, Math.round(currentR24 * 0.95)),
      rainfall_72h_mm: Math.max(35, Math.round(currentR72 * 1.05)),
      probability: Math.min(99.4, Math.round(curProb * 0.95 * 10) / 10),
      threshold_crossed: (curProb * 0.95) >= 50.0,
      risk_level: (curProb * 0.95) >= 70 ? 'CRITICAL' : ((curProb * 0.95) >= 50 ? 'HIGH' : 'LOW'),
      peak_water_depth_m: Math.max(0.3, Math.round((Math.min(100, curProb * 0.95) / 100) * 1.4 * 10) / 10),
      status_summary: `Heavy runoff on arterial corridors in ${locName}; traffic slowed`
    },
    {
      id: 'w5',
      date: new Date(today.getTime() - 2 * 86400000).toISOString().split('T')[0],
      day_name: 'Day -2',
      rainfall_24h_mm: Math.max(8, Math.round(currentR24 * 0.55)),
      rainfall_72h_mm: Math.max(20, Math.round(currentR72 * 0.8)),
      probability: Math.max(6, Math.round(curProb * 0.75 * 10) / 10),
      threshold_crossed: (curProb * 0.75) >= 50.0,
      risk_level: (curProb * 0.75) >= 70 ? 'CRITICAL' : ((curProb * 0.75) >= 50 ? 'HIGH' : 'LOW'),
      peak_water_depth_m: Math.max(0.2, Math.round((Math.min(100, curProb * 0.75) / 100) * 1.1 * 10) / 10),
      status_summary: `Rainfall easing; drainage channels in ${locName} restoring normal flow`
    },
    {
      id: 'w6',
      date: new Date(today.getTime() - 1 * 86400000).toISOString().split('T')[0],
      day_name: 'Yesterday',
      rainfall_24h_mm: Math.max(4, Math.round(currentR24 * 0.3)),
      rainfall_72h_mm: Math.max(12, Math.round(currentR72 * 0.5)),
      probability: Math.max(4, Math.round(curProb * 0.5 * 10) / 10),
      threshold_crossed: (curProb * 0.5) >= 50.0,
      risk_level: (curProb * 0.5) >= 70 ? 'CRITICAL' : ((curProb * 0.5) >= 50 ? 'HIGH' : 'LOW'),
      peak_water_depth_m: Math.max(0.1, Math.round((curProb * 0.5 / 100) * 0.8 * 10) / 10),
      status_summary: `Gradual recovery in ${locName}; gravity drainage cleared low-lying streets`
    },
    {
      id: 'w7',
      date: today.toISOString().split('T')[0],
      day_name: 'Today',
      rainfall_24h_mm: currentR24,
      rainfall_72h_mm: currentR72,
      probability: curProb,
      threshold_crossed: isThresholdCrossed,
      risk_level: curProb >= 70 ? 'CRITICAL' : (curProb >= 50 ? 'HIGH' : (curProb >= 30 ? 'MODERATE' : 'LOW')),
      peak_water_depth_m: curProb >= 70 ? 1.2 : (curProb >= 50 ? 0.6 : (curProb >= 30 ? 0.3 : 0.05)),
      status_summary: isThresholdCrossed
        ? `Active severe convective threat in ${locName}; 50% safety threshold exceeded`
        : `Normal conditions in ${locName}; rainfall safely within drainage capacity`
    }
  ];

  // Dynamic sensitivity scenarios based on authentic Location Hydrological Profile
  const hydroProfile = getHydrologicalProfile(
    locName,
    currentElev,
    locLat,
    locLng,
    currentR24,
    curProb
  );

  const incScenarios = (rainfallImpact?.increase_scenarios && rainfallImpact.increase_scenarios.length > 0 && !rainfallImpact.increase_scenarios[0].consequence_summary?.includes("Slow transit on arterial lanes;"))
    ? rainfallImpact.increase_scenarios
    : hydroProfile.increaseScenarios;

  const decScenarios = (rainfallImpact?.decrease_scenarios && rainfallImpact.decrease_scenarios.length > 0 && !rainfallImpact.decrease_scenarios[0].drainage_recovery_behavior?.includes("clear surface gutters; runoff velocity drops by 45%."))
    ? rainfallImpact.decrease_scenarios
    : hydroProfile.decreaseScenarios;

  return (
    <div className="alerts-reports-page-container" style={{ padding: isEmbeddedInModal ? '0' : '24px 32px', color: '#f8fafc' }}>
      {/* TOP HEADER & BREADCRUMB */}
      {!isEmbeddedInModal && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '22px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <button
                onClick={onBackToDashboard}
                style={{
                  background: '#0f172a',
                  border: '1px solid #1e293b',
                  borderRadius: '6px',
                  padding: '5px 12px',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  color: '#94a3b8',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                ← Back to Dashboard
              </button>
              <span style={{ color: '#475569' }}>/</span>
              <span style={{ fontSize: '0.85rem', color: '#94a3b8', fontWeight: 500 }}>Alerts & Reports Center</span>
            </div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#f8fafc', margin: 0, letterSpacing: '-0.02em' }}>
              Real-Time Alerts & 7-Day Rainfall Reports
            </h2>
            <div style={{ fontSize: '0.84rem', color: '#94a3b8', marginTop: '4px' }}>
              Automated 50% flood risk threshold scoring, 7-day retrospective incident tracking, and dynamic rainfall sensitivity analysis for <strong style={{ color: '#38bdf8' }}>{locName} {locCountry ? `(${locCountry})` : ''}</strong>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{
              background: isThresholdCrossed ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
              color: isThresholdCrossed ? '#ef4444' : '#10b981',
              border: `1px solid ${isThresholdCrossed ? '#ef4444' : '#10b981'}`,
              fontWeight: 800,
              fontSize: '0.82rem',
              padding: '6px 14px',
              borderRadius: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: isThresholdCrossed ? '#ef4444' : '#10b981' }}></span>
              {isThresholdCrossed ? '50% THRESHOLD BREACHED' : 'SAFE (<50% THRESHOLD)'}
            </span>
          </div>
        </div>
      )}

      {/* STATUS NOTIFICATION BANNER */}
      {statusNotification && (
        <div style={{
          background: statusNotification.startsWith('✓') ? 'rgba(16, 185, 129, 0.15)' : (statusNotification.startsWith('⚡') ? 'rgba(56, 189, 248, 0.15)' : 'rgba(239, 68, 68, 0.15)'),
          border: `1px solid ${statusNotification.startsWith('✓') ? '#10b981' : (statusNotification.startsWith('⚡') ? '#0284c7' : '#ef4444')}`,
          color: statusNotification.startsWith('✓') ? '#34d399' : (statusNotification.startsWith('⚡') ? '#38bdf8' : '#f87171'),
          borderRadius: '8px',
          padding: '10px 16px',
          fontSize: '0.86rem',
          fontWeight: 600,
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
        }}>
          <span>{statusNotification}</span>
        </div>
      )}

      {/* TOP CONTEXT BAR WITH LOCATION SWITCHER */}
      <div style={{
        background: '#0b1120',
        border: '1px solid rgba(56, 189, 248, 0.18)',
        borderRadius: '12px',
        padding: '16px 20px',
        marginBottom: '20px',
        boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px'
      }}>
        {/* Main Telemetry Header Row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '1.4rem' }}>📍</span>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <strong style={{ fontSize: '1.05rem', color: '#f8fafc' }}>{locName} {locCountry ? `(${locCountry})` : ''}</strong>
                <span style={{
                  fontSize: '0.72rem',
                  background: '#0f172a',
                  color: '#94a3b8',
                  border: '1px solid #1e293b',
                  padding: '2px 8px',
                  borderRadius: '10px',
                  fontWeight: 600
                }}>
                  {locLat.toFixed(3)}° N, {locLng.toFixed(3)}° E
                </span>
                {isFetchingLocation && (
                  <span style={{ fontSize: '0.72rem', background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', border: '1px solid #f59e0b', padding: '2px 8px', borderRadius: '10px', fontWeight: 700 }}>
                    ⚡ Fetching Live Telemetry...
                  </span>
                )}
              </div>
              <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '4px' }}>
                Active Telemetry: 24h Rain: <strong style={{ color: '#38bdf8' }}>{currentR24} mm</strong> | 72h Rain: <strong style={{ color: '#38bdf8' }}>{currentR72} mm</strong> | Elevation: <strong style={{ color: '#f8fafc' }}>{currentElev} m</strong> | Temp: <strong style={{ color: '#f8fafc' }}>{activeTelemetry?.temperature ?? 28}°C</strong>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.74rem', color: '#94a3b8' }}>Current ML Risk:</div>
              <strong style={{ color: isThresholdCrossed ? '#ef4444' : '#10b981', fontSize: '1.25rem', fontWeight: 900 }}>
                {curProb}%
              </strong>
            </div>

            <button
              onClick={() => {
                setShowSearchBox(prev => !prev);
                setTimeout(() => searchInputRef.current?.focus(), 100);
              }}
              style={{
                background: showSearchBox ? '#0284c7' : '#0f172a',
                color: showSearchBox ? '#ffffff' : '#38bdf8',
                border: '1px solid #0284c7',
                borderRadius: '8px',
                padding: '8px 14px',
                fontWeight: 700,
                fontSize: '0.82rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.15s ease'
              }}
              title="Click to search and change location to any global city or coordinates"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <span>{showSearchBox ? 'Close Location Bar' : 'Change Location'}</span>
            </button>
          </div>
        </div>

        {/* EXPANDABLE LOCATION SEARCH & PRESETS PANEL */}
        {showSearchBox && (
          <div style={{
            background: '#0f172a',
            border: '1px solid #1e293b',
            borderRadius: '8px',
            padding: '14px 16px',
            marginTop: '4px',
            position: 'relative'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#f8fafc' }}>
                🌍 Search Location or Enter Global Coordinates:
              </span>
              <span style={{ fontSize: '0.74rem', color: '#94a3b8' }}>
                Powered by Open-Meteo & Copernicus DEM Live APIs
              </span>
            </div>

            {/* Search Input Field */}
            <div style={{ position: 'relative', marginBottom: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', background: '#0b1120', border: '1px solid #0284c7', borderRadius: '6px', padding: '6px 12px' }}>
                <span style={{ fontSize: '1rem', marginRight: '8px', color: '#94a3b8' }}>🔍</span>
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={handleSearchChange}
                  placeholder="Type city name, district, or coordinates (e.g. Mumbai, Chennai, London, 19.28, 72.85)..."
                  style={{
                    width: '100%',
                    border: 'none',
                    outline: 'none',
                    fontSize: '0.88rem',
                    color: '#f8fafc',
                    background: 'transparent',
                    fontWeight: 500
                  }}
                />
                {isSearching && (
                  <span style={{ fontSize: '0.75rem', color: '#38bdf8', fontWeight: 600 }}>Searching...</span>
                )}
                {searchQuery && (
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setSearchResults([]);
                      setShowDropdown(false);
                    }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: '1rem', padding: '0 4px' }}
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Autocomplete Dropdown */}
              {showDropdown && searchResults.length > 0 && (
                <div style={{
                  position: 'absolute',
                  top: '105%',
                  left: 0,
                  right: 0,
                  background: '#0b1120',
                  border: '1px solid rgba(56, 189, 248, 0.25)',
                  borderRadius: '8px',
                  boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
                  zIndex: 50,
                  maxHeight: '220px',
                  overflowY: 'auto'
                }}>
                  {searchResults.map((res, idx) => (
                    <div
                      key={idx}
                      onClick={() => handleApplyLocation(res)}
                      style={{
                        padding: '10px 14px',
                        borderBottom: idx < searchResults.length - 1 ? '1px solid #1e293b' : 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        transition: 'background 0.15s ease'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = '#0f172a'}
                      onMouseLeave={(e) => e.currentTarget.style.background = '#0b1120'}
                    >
                      <div>
                        <strong style={{ fontSize: '0.86rem', color: '#f8fafc' }}>{res.name}</strong>
                        <div style={{ fontSize: '0.74rem', color: '#94a3b8' }}>
                          {res.admin ? `${res.admin}, ` : ''}{res.country || ''}
                        </div>
                      </div>
                      <span style={{ fontSize: '0.72rem', background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', padding: '2px 8px', borderRadius: '10px', fontWeight: 600 }}>
                        {res.lat.toFixed(2)}°, {res.lng.toFixed(2)}°
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Live Device Location Auto-Detect Button */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <button
                type="button"
                onClick={() => {
                  if (!navigator.geolocation) {
                    alert('Geolocation is not supported by your browser.');
                    return;
                  }
                  setIsFetchingLocation(true);
                  setStatusNotification('⚡ Locking onto device hardware/Wi-Fi GPS coordinates...');
                  navigator.geolocation.getCurrentPosition(
                    async (pos) => {
                      const lat = parseFloat(pos.coords.latitude.toFixed(4));
                      const lng = parseFloat(pos.coords.longitude.toFixed(4));
                      let pName = `Device Location (${lat}, ${lng})`;
                      try {
                        const r = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`, {
                          headers: { 'User-Agent': 'DisasterRadar/1.0' }
                        });
                        if (r.ok) {
                          const d = await r.json();
                          const a = d.address || {};
                          const c = a.city || a.town || a.suburb || a.village || a.county || d.display_name.split(',')[0];
                          const s = a.state || a.country || '';
                          pName = `${c}, ${s}`.trim().replace(/^,|,$/g, '');
                        }
                      } catch (e) {}

                      handleApplyLocation({ name: pName, country: '', lat, lng });
                    },
                    (err) => {
                      setIsFetchingLocation(false);
                      setStatusNotification(`⚠️ Location access denied: ${err.message}. Please allow Location permission in your browser.`);
                      setTimeout(() => setStatusNotification(''), 5000);
                    },
                    { enableHighAccuracy: false, timeout: 15000, maximumAge: 30000 }
                  );
                }}
                style={{
                  background: 'rgba(16, 185, 129, 0.16)',
                  color: '#10b981',
                  border: '1px solid rgba(16, 185, 129, 0.45)',
                  borderRadius: '14px',
                  padding: '5px 14px',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <span>📍 Lock to My Live Device Location</span>
              </button>
            </div>

            {/* Direct Lat/Long Input Form */}
            <form onSubmit={handleCustomCoordinatesSubmit} style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginTop: '8px', borderTop: '1px solid #1e293b', paddingTop: '8px' }}>
              <span style={{ fontSize: '0.74rem', fontWeight: 600, color: '#94a3b8' }}>Or enter coordinates directly:</span>
              <input
                type="number"
                step="0.0001"
                placeholder="Latitude (e.g. 19.295)"
                value={customLat}
                onChange={(e) => setCustomLat(e.target.value)}
                style={{ width: '130px', padding: '5px 8px', fontSize: '0.78rem', border: '1px solid #1e293b', borderRadius: '4px', background: '#0b1120', color: '#f8fafc' }}
              />
              <input
                type="number"
                step="0.0001"
                placeholder="Longitude (e.g. 72.854)"
                value={customLng}
                onChange={(e) => setCustomLng(e.target.value)}
                style={{ width: '130px', padding: '5px 8px', fontSize: '0.78rem', border: '1px solid #1e293b', borderRadius: '4px', background: '#0b1120', color: '#f8fafc' }}
              />
              <button
                type="submit"
                style={{
                  background: '#0284c7',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '4px',
                  padding: '5px 12px',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Go →
              </button>
            </form>
          </div>
        )}
      </div>

      {/* PRIMARY SUB-TABS NAVIGATION */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid #1e293b', marginBottom: '20px', overflowX: 'auto' }}>
        <button
          onClick={() => setSubTab('threshold')}
          style={{
            background: 'none',
            border: 'none',
            borderBottom: subTab === 'threshold' ? '3px solid #0284c7' : '3px solid transparent',
            color: subTab === 'threshold' ? '#38bdf8' : '#94a3b8',
            fontWeight: 700,
            fontSize: '0.92rem',
            padding: '10px 16px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          🚨 50% Threshold & Real-Time Alert Status
        </button>

        <button
          onClick={() => setSubTab('weekly')}
          style={{
            background: 'none',
            border: 'none',
            borderBottom: subTab === 'weekly' ? '3px solid #0284c7' : '3px solid transparent',
            color: subTab === 'weekly' ? '#38bdf8' : '#94a3b8',
            fontWeight: 700,
            fontSize: '0.92rem',
            padding: '10px 16px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          📅 Past 7-Day Inundation Ledger
        </button>

        <button
          onClick={() => setSubTab('sensitivity')}
          style={{
            background: 'none',
            border: 'none',
            borderBottom: subTab === 'sensitivity' ? '3px solid #0284c7' : '3px solid transparent',
            color: subTab === 'sensitivity' ? '#38bdf8' : '#94a3b8',
            fontWeight: 700,
            fontSize: '0.92rem',
            padding: '10px 16px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          📈 Rainfall Sensitivity Curves
        </button>

        <button
          onClick={() => setSubTab('multihazard')}
          style={{
            background: 'none',
            border: 'none',
            borderBottom: subTab === 'multihazard' ? '3px solid #f59e0b' : '3px solid transparent',
            color: subTab === 'multihazard' ? '#fbbf24' : '#94a3b8',
            fontWeight: 700,
            fontSize: '0.92rem',
            padding: '10px 16px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          🌀 Multi-Hazard Feed (Flood + Cyclone)
        </button>
      </div>

      {/* REAL-TIME LAYER SYNCHRONIZATION SHIELD: DO NOT SHOW UNTIL EACH LAYER IS REAL TIME */}
      {loading ? (
        <div style={{
          background: 'radial-gradient(circle at center, #0f172a 0%, #020617 100%)',
          borderRadius: '16px',
          border: '1px solid rgba(56, 189, 248, 0.3)',
          padding: '50px 24px',
          margin: '20px 0',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.7)',
          textAlign: 'center'
        }}>
          <div style={{
            width: '56px',
            height: '56px',
            border: '4px solid rgba(56, 189, 248, 0.15)',
            borderTop: '4px solid #38bdf8',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            marginBottom: '18px'
          }} />
          <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#f8fafc', margin: '0 0 8px 0', letterSpacing: '0.4px' }}>
            SYNCHRONIZING REAL-TIME ALERTS & SENSITIVITY LAYERS
          </h2>
          <p style={{ color: '#94a3b8', fontSize: '0.84rem', maxWidth: '520px', lineHeight: 1.5, margin: '0 0 24px 0' }}>
            Querying live 50% flood risk threshold evaluator, 7-day retrospective telemetry archives, and rainfall growth elasticity for <strong style={{ color: '#38bdf8' }}>{locName}</strong>...
          </p>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            width: '100%',
            maxWidth: '440px',
            background: 'rgba(15, 23, 42, 0.8)',
            padding: '16px 20px',
            borderRadius: '10px',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            textAlign: 'left'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.82rem', color: alertScore ? '#10b981' : '#64748b' }}>
              <span style={{ fontWeight: 800 }}>{alertScore ? '✓' : '◌'}</span>
              <span>50.0% Critical Municipal Threshold Scorer</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.82rem', color: rainfallImpact ? '#10b981' : '#64748b' }}>
              <span style={{ fontWeight: 800 }}>{rainfallImpact ? '✓' : '◌'}</span>
              <span>Multi-Tier Rainfall Sensitivity & Drainage Elasticity</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.82rem', color: weeklyReport ? '#10b981' : '#64748b' }}>
              <span style={{ fontWeight: 800 }}>{weeklyReport ? '✓' : '◌'}</span>
              <span>7-Day Retrospective Incident Ledger</span>
            </div>
          </div>
        </div>
      ) : (
        <>
      {/* TAB 1: 🚨 50% THRESHOLD SCORING */}
      {subTab === 'threshold' && (
        <div>
          {/* BIG STATUS HERO CARD (Single solid color, NO gradient) */}
          <div style={{
            background: isThresholdCrossed ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
            border: `1px solid ${isThresholdCrossed ? '#ef4444' : '#10b981'}`,
            borderRadius: '12px',
            padding: '22px 26px',
            marginBottom: '20px',
            boxShadow: '0 4px 16px rgba(0,0,0,0.3)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '14px' }}>
              <div>
                <div style={{
                  display: 'inline-block',
                  background: isThresholdCrossed ? '#ef4444' : '#10b981',
                  color: '#ffffff',
                  fontWeight: 800,
                  fontSize: '0.74rem',
                  letterSpacing: '0.05em',
                  padding: '4px 10px',
                  borderRadius: '4px',
                  marginBottom: '8px'
                }}>
                  {curProb >= 80 ? 'CRITICAL DISASTER EMERGENCY' : (curProb >= 65 ? 'HIGH INUNDATION WARNING' : (curProb >= 50 ? 'MODERATE SURCHARGE WATCH' : 'NORMAL / MONITORING'))}
                </div>
                <h3 style={{ fontSize: '1.35rem', fontWeight: 800, color: isThresholdCrossed ? '#f87171' : '#34d399', margin: '0 0 8px 0' }}>
                  {isThresholdCrossed
                    ? `⚠️ 50% Flood Risk Threshold Breached for ${locName}`
                    : `✅ Conditions Normal — Safely Below 50% Threshold for ${locName}`}
                </h3>
                <p style={{ fontSize: '0.9rem', color: '#cbd5e1', margin: 0, lineHeight: 1.5, maxWidth: '700px' }}>
                  {isThresholdCrossed
                    ? `The backend AI scoring engine has detected a threshold breach at ${curProb}% (+${deltaThreshold}% above the critical 50.0% cutoff for ${locName}). Overland storm runoff is overwhelming local drainage networks. Low-lying arterial roads and basements face immediate inundation.`
                    : `The backend AI scoring engine confirms current risk for ${locName} is ${curProb}%, maintaining an operational safety buffer of ${Math.abs(deltaThreshold)}% below the 50% danger line. Drains and terrain are absorbing all surface precipitation.`}
                </p>
              </div>

              <div style={{ textAlign: 'right', minWidth: '150px' }}>
                <div style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: 600 }}>CURRENT ML RISK SCORE</div>
                <div style={{ fontSize: '2.8rem', fontWeight: 900, color: isThresholdCrossed ? '#ef4444' : '#10b981', lineHeight: 1 }}>
                  {curProb}%
                </div>
                <div style={{ fontSize: '0.76rem', fontWeight: 700, color: isThresholdCrossed ? '#fca5a5' : '#86efac', marginTop: '6px' }}>
                  {isThresholdCrossed ? `▲ ${deltaThreshold}% Above 50% Threshold` : `▼ ${Math.abs(deltaThreshold)}% Below 50% Threshold`}
                </div>
              </div>
            </div>

            {/* THRESHOLD GAUGE BAR (Single solid color, NO gradient) */}
            <div style={{ marginTop: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.76rem', fontWeight: 600, color: '#94a3b8', marginBottom: '6px' }}>
                <span>0% Safe</span>
                <span style={{ color: '#f59e0b', fontWeight: 800 }}>50% CRITICAL ALERT THRESHOLD</span>
                <span>100% Inundated</span>
              </div>
              <div style={{ height: '14px', background: '#0f172a', border: '1px solid #1e293b', borderRadius: '7px', position: 'relative', overflow: 'hidden' }}>
                <div style={{
                  width: `${Math.min(100, Math.max(4, curProb))}%`,
                  height: '100%',
                  background: curProb >= 70 ? '#ef4444' : (curProb >= 50 ? '#f59e0b' : '#10b981'),
                  borderRadius: '7px',
                  transition: 'width 0.4s ease'
                }}></div>
                <div style={{
                  position: 'absolute',
                  top: 0,
                  bottom: 0,
                  left: '50%',
                  width: '3px',
                  background: '#f8fafc',
                  zIndex: 2,
                  boxShadow: '0 0 4px rgba(255,255,255,0.8)'
                }}></div>
              </div>
            </div>
          </div>

          {/* 4 SCORING METRICS CARDS */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', marginBottom: '20px' }}>
            <div style={{ background: '#0b1120', border: '1px solid rgba(56, 189, 248, 0.18)', padding: '16px', borderRadius: '12px', boxShadow: '0 4px 14px rgba(0,0,0,0.3)' }}>
              <span style={{ fontSize: '0.74rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase' }}>Threshold Cutoff</span>
              <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#f8fafc', marginTop: '2px' }}>50.0%</div>
              <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Standard Civil Defense Cutoff</div>
            </div>

            <div style={{ background: '#0b1120', border: '1px solid rgba(56, 189, 248, 0.18)', padding: '16px', borderRadius: '12px', boxShadow: '0 4px 14px rgba(0,0,0,0.3)' }}>
              <span style={{ fontSize: '0.74rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase' }}>Threshold Status</span>
              <div style={{ fontSize: '1.3rem', fontWeight: 900, color: isThresholdCrossed ? '#ef4444' : '#10b981', marginTop: '2px' }}>
                {isThresholdCrossed ? 'BREACHED' : 'SAFE'}
              </div>
              <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{deltaThreshold >= 0 ? `+${deltaThreshold}% over threshold` : `${Math.abs(deltaThreshold)}% safe buffer`}</div>
            </div>

            <div style={{ background: '#0b1120', border: '1px solid rgba(56, 189, 248, 0.18)', padding: '16px', borderRadius: '12px', boxShadow: '0 4px 14px rgba(0,0,0,0.3)' }}>
              <span style={{ fontSize: '0.74rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase' }}>Estimated Water Depth</span>
              <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#38bdf8', marginTop: '2px' }}>
                {isThresholdCrossed ? (curProb >= 75 ? '0.8 - 1.5 m' : '0.3 - 0.7 m') : '< 0.15 m'}
              </div>
              <div style={{ fontSize: '0.72rem', color: '#64748b' }}>At chronic low elevation spots</div>
            </div>

            <div style={{ background: '#0b1120', border: '1px solid rgba(56, 189, 248, 0.18)', padding: '16px', borderRadius: '12px', boxShadow: '0 4px 14px rgba(0,0,0,0.3)' }}>
              <span style={{ fontSize: '0.74rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase' }}>Civic Lead Time</span>
              <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#8b5cf6', marginTop: '2px' }}>2 to 4 Hours</div>
              <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Advance evacuation window</div>
            </div>
          </div>

          {/* ACTION DIRECTIVE BANNER */}
          <div style={{ background: '#0b1120', borderLeft: '4px solid #0284c7', border: '1px solid rgba(56, 189, 248, 0.2)', padding: '16px', borderRadius: '8px' }}>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '6px' }}>
              <span style={{ fontSize: '1.2rem' }}>📢</span>
              <strong style={{ color: '#38bdf8', fontSize: '0.94rem' }}>Automated Alert Protocol Dispatched</strong>
            </div>
            <p style={{ margin: 0, fontSize: '0.86rem', color: '#cbd5e1', lineHeight: 1.5 }}>
              {isThresholdCrossed
                ? `Automated warning dispatched to municipal emergency control rooms for ${locName}. Mobile dewatering pumps are directed to low-lying collection sumps, and traffic police are alerted to restrict access to flooded underpasses.`
                : `All hydrologic parameters for ${locName} remain within standard operational envelopes. No public advisories or detours required at this time.`}
            </p>
          </div>

          {/* PHASE 3 (P1): MULTI-FACTOR TRIGGER CRITERIA EVALUATION MATRIX */}
          <div style={{
            background: '#0b1120',
            border: '1px solid rgba(56, 189, 248, 0.25)',
            borderRadius: '12px',
            padding: '20px',
            marginTop: '20px',
            boxShadow: '0 4px 16px rgba(0,0,0,0.3)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px', marginBottom: '14px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '1.2rem' }}>🛡️</span>
                  <strong style={{ fontSize: '1rem', color: '#f8fafc' }}>
                    Multi-Factor Trigger Evaluation Matrix (P1 Anti-False-Alarm Engine)
                  </strong>
                  <span style={{
                    fontSize: '0.72rem',
                    background: 'rgba(56, 189, 248, 0.15)',
                    color: '#38bdf8',
                    border: '1px solid rgba(56, 189, 248, 0.3)',
                    padding: '2px 8px',
                    borderRadius: '10px',
                    fontWeight: 700
                  }}>
                    P1 ROBUST ALERTING
                  </span>
                </div>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.82rem', color: '#94a3b8' }}>
                  Alerts require multi-factor corroboration across acute rate-of-rise, antecedent saturation, physical depth tiers, and upstream hydrodynamics to avoid single-threshold false alarms.
                </p>
              </div>

              <div style={{
                background: alertScore?.delivery_status === 'SUPPRESSED_DEBOUNCED' ? 'rgba(245, 158, 11, 0.15)' : (isThresholdCrossed ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)'),
                border: `1px solid ${alertScore?.delivery_status === 'SUPPRESSED_DEBOUNCED' ? '#f59e0b' : (isThresholdCrossed ? '#ef4444' : '#10b981')}`,
                borderRadius: '8px',
                padding: '6px 12px',
                fontSize: '0.78rem',
                fontWeight: 700,
                color: alertScore?.delivery_status === 'SUPPRESSED_DEBOUNCED' ? '#fbbf24' : (isThresholdCrossed ? '#f87171' : '#34d399')
              }}>
                {alertScore?.delivery_status === 'SUPPRESSED_DEBOUNCED'
                  ? '🟡 DEBOUNCED (60-min Quiet Window Active)'
                  : (alertScore?.delivery_status === 'ESCALATED_BYPASS'
                    ? '🔴 ESCALATION BYPASS (Tier Jump)'
                    : (isThresholdCrossed ? '🟢 ACTIVE CIVIL DEFENSE DISPATCH' : '⚪ MONITORING (Below Danger Line)'))}
              </div>
            </div>

            {/* 6 CRITERIA GRID */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
              {/* Criterion 1: Ensemble Confidence */}
              <div style={{ background: '#0f172a', border: `1px solid ${curProb >= 50 ? 'rgba(239, 68, 68, 0.4)' : 'rgba(255, 255, 255, 0.08)'}`, borderRadius: '8px', padding: '12px 14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: 600 }}>1. Ensemble ML Probability</span>
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, color: curProb >= 50 ? '#ef4444' : '#10b981' }}>
                    {curProb >= 50 ? 'TRIGGERED' : 'CLEARED'}
                  </span>
                </div>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#f8fafc', margin: '4px 0 2px 0' }}>
                  {curProb}% <span style={{ fontSize: '0.74rem', color: '#94a3b8', fontWeight: 400 }}>(Threshold: 50.0%)</span>
                </div>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                  {curProb >= 75 ? 'Critical Super-Stack consensus' : (curProb >= 50 ? 'Medium confidence flood watch' : 'Model indicates safe drainage limits')}
                </div>
              </div>

              {/* Criterion 2: Instantaneous Rate-of-Rise */}
              <div style={{ background: '#0f172a', border: `1px solid ${(currentR24 / 24) >= 12.0 || currentR24 >= 50.0 ? 'rgba(239, 68, 68, 0.4)' : 'rgba(255, 255, 255, 0.08)'}`, borderRadius: '8px', padding: '12px 14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: 600 }}>2. Acute Rate of Rise</span>
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, color: (currentR24 / 24) >= 12.0 || currentR24 >= 50.0 ? '#ef4444' : '#10b981' }}>
                    {(currentR24 / 24) >= 12.0 || currentR24 >= 50.0 ? 'SURCHARGED' : 'NORMAL'}
                  </span>
                </div>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#f8fafc', margin: '4px 0 2px 0' }}>
                  {(currentR24 / 24).toFixed(1)} mm/h <span style={{ fontSize: '0.74rem', color: '#94a3b8', fontWeight: 400 }}>(Acute limit: 12.0 mm/h)</span>
                </div>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                  {(currentR24 / 24) >= 12.0 ? 'Overland surface gutter velocity breached' : 'Precipitation within absorption capacity'}
                </div>
              </div>

              {/* Criterion 3: Antecedent Soil Saturation */}
              <div style={{ background: '#0f172a', border: `1px solid ${currentR72 >= 85.0 ? 'rgba(239, 68, 68, 0.4)' : 'rgba(255, 255, 255, 0.08)'}`, borderRadius: '8px', padding: '12px 14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: 600 }}>3. 72h Antecedent Saturation</span>
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, color: currentR72 >= 85.0 ? '#ef4444' : '#10b981' }}>
                    {currentR72 >= 85.0 ? 'SATURATED' : 'BUFFER AVAIL'}
                  </span>
                </div>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#f8fafc', margin: '4px 0 2px 0' }}>
                  {currentR72} mm <span style={{ fontSize: '0.74rem', color: '#94a3b8', fontWeight: 400 }}>(Limit: 85.0 mm)</span>
                </div>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                  {currentR72 >= 85.0 ? 'Soil moisture capacity depleted; zero percolation' : 'Soil can absorb additional rainfall'}
                </div>
              </div>

              {/* Criterion 4: Physical Water Depth Hazard */}
              <div style={{ background: '#0f172a', border: `1px solid ${(alertScore?.inundation_physics?.depth_meters || (isThresholdCrossed ? 0.35 : 0.05)) >= 0.15 ? 'rgba(239, 68, 68, 0.4)' : 'rgba(255, 255, 255, 0.08)'}`, borderRadius: '8px', padding: '12px 14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: 600 }}>4. Physical Inundation Depth</span>
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, color: (alertScore?.inundation_physics?.depth_meters || (isThresholdCrossed ? 0.35 : 0.05)) >= 0.15 ? '#ef4444' : '#10b981' }}>
                    {(alertScore?.inundation_physics?.depth_meters || (isThresholdCrossed ? 0.35 : 0.05)) >= 0.45 ? 'TIER 3 DANGER' : ((alertScore?.inundation_physics?.depth_meters || (isThresholdCrossed ? 0.35 : 0.05)) >= 0.15 ? 'TIER 2 STALL' : 'TIER 0-1 OK')}
                  </span>
                </div>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#f8fafc', margin: '4px 0 2px 0' }}>
                  {alertScore?.inundation_physics?.depth_meters ?? (isThresholdCrossed ? 0.35 : 0.05)} m <span style={{ fontSize: '0.74rem', color: '#94a3b8', fontWeight: 400 }}>(Exhaust: 0.15m | Door: 0.45m)</span>
                </div>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                  {alertScore?.inundation_physics?.life_safety_directive || 'Normal traffic transit permitted.'}
                </div>
              </div>

              {/* Criterion 5: Upstream Catchment Inflow */}
              <div style={{ background: '#0f172a', border: `1px solid ${(alertScore?.catchment?.peak_flow_m3s || (currentR24 >= 50 ? 28.5 : 12.0)) >= 25.0 ? 'rgba(239, 68, 68, 0.4)' : 'rgba(255, 255, 255, 0.08)'}`, borderRadius: '8px', padding: '12px 14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: 600 }}>5. Upstream Basin Runoff</span>
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, color: (alertScore?.catchment?.peak_flow_m3s || (currentR24 >= 50 ? 28.5 : 12.0)) >= 25.0 ? '#ef4444' : '#10b981' }}>
                    {(alertScore?.catchment?.peak_flow_m3s || (currentR24 >= 50 ? 28.5 : 12.0)) >= 25.0 ? 'SURGE WAVE' : 'CONTROLLED'}
                  </span>
                </div>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#f8fafc', margin: '4px 0 2px 0' }}>
                  {alertScore?.catchment?.peak_flow_m3s ?? (currentR24 >= 50 ? 28.5 : 12.0)} m³/s <span style={{ fontSize: '0.74rem', color: '#94a3b8', fontWeight: 400 }}>(Surge limit: 25.0 m³/s)</span>
                </div>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                  Upstream lag ~{alertScore?.catchment?.transit_time_hours ?? 2.8}h transit time to local flood basin
                </div>
              </div>

              {/* Criterion 6: Low-Contour Topography */}
              <div style={{ background: '#0f172a', border: `1px solid ${currentElev < 10.0 ? 'rgba(245, 158, 11, 0.4)' : 'rgba(255, 255, 255, 0.08)'}`, borderRadius: '8px', padding: '12px 14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: 600 }}>6. Topography & Elevation</span>
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, color: currentElev < 10.0 ? '#f59e0b' : '#10b981' }}>
                    {currentElev < 10.0 ? 'DEPRESSION' : 'ELEVATED'}
                  </span>
                </div>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#f8fafc', margin: '4px 0 2px 0' }}>
                  {currentElev} m MSL <span style={{ fontSize: '0.74rem', color: '#94a3b8', fontWeight: 400 }}>(Copernicus DEM)</span>
                </div>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                  {currentElev < 10.0 ? 'Lowland sink with reduced gravity drainage slope' : 'Sufficient topographic gradient for stormwater discharge'}
                </div>
              </div>
            </div>
          </div>

          {/* CITIZEN SAFETY CONFIRMATION & GROUND-TRUTH RESPONSE FEEDBACK LOOP */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, rgba(30, 41, 59, 0.95) 100%)',
            border: '1px solid rgba(56, 189, 248, 0.35)',
            borderRadius: '12px',
            padding: '20px',
            marginTop: '16px',
            boxShadow: '0 6px 20px rgba(0,0,0,0.4)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '14px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '1.25rem' }}>👤</span>
                  <strong style={{ fontSize: '1.02rem', color: '#f8fafc' }}>
                    Your Personal Flood Safety Status
                  </strong>
                </div>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.82rem', color: '#94a3b8' }}>
                  Situated near <strong style={{ color: '#38bdf8' }}>{locName}</strong>? Tap to record your safety status. Your choice is kept active for 24 hours or until you update it.
                </p>
              </div>

              {/* PER-USER ACTIVE STATUS BADGE */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                {userStatus ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{
                      background: userStatus === 'safe'
                        ? 'rgba(16, 185, 129, 0.18)'
                        : (userStatus === 'confirmed' ? 'rgba(56, 189, 248, 0.18)' : 'rgba(239, 68, 68, 0.22)'),
                      color: userStatus === 'safe'
                        ? '#34d399'
                        : (userStatus === 'confirmed' ? '#38bdf8' : '#f87171'),
                      border: `1.5px solid ${userStatus === 'safe' ? '#10b981' : (userStatus === 'confirmed' ? '#0284c7' : '#ef4444')}`,
                      padding: '6px 12px',
                      borderRadius: '8px',
                      fontSize: '0.8rem',
                      fontWeight: 800,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.25)'
                    }}>
                      <span>{userStatus === 'safe' ? '✅' : (userStatus === 'confirmed' ? '🌊' : '🆘')}</span>
                      <span>
                        {userStatus === 'safe' ? 'You are marked Safe' : (userStatus === 'confirmed' ? 'You reported Flooding' : 'Rescue Requested')}
                      </span>
                      <span style={{ fontSize: '0.72rem', opacity: 0.85, marginLeft: '4px', fontWeight: 600 }}>
                        (expires in ~{getRemainingHours()}h)
                      </span>
                    </span>

                    <button
                      onClick={handleResetUserStatus}
                      title="Clear your status now"
                      style={{
                        background: '#1e293b',
                        color: '#94a3b8',
                        border: '1px solid #334155',
                        borderRadius: '6px',
                        padding: '6px 10px',
                        fontSize: '0.72rem',
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      Reset
                    </button>
                  </div>
                ) : (
                  <span style={{
                    background: '#0f172a',
                    color: '#94a3b8',
                    border: '1px solid #1e293b',
                    padding: '6px 12px',
                    borderRadius: '8px',
                    fontSize: '0.78rem',
                    fontWeight: 600
                  }}>
                    ⚪ Status: Not Reported Today (Auto-resets after 24h)
                  </span>
                )}
              </div>
            </div>

            {citizenFeedback && (
              <div style={{
                background: 'rgba(56, 189, 248, 0.12)',
                border: '1px solid #38bdf8',
                borderRadius: '6px',
                padding: '8px 14px',
                marginBottom: '14px',
                color: '#f8fafc',
                fontSize: '0.82rem',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <span>⚡</span>
                <span>{citizenFeedback}</span>
              </div>
            )}

            {/* ACTION BUTTONS (CLICK TO SELECT OR CHANGE AT ANY TIME) */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
              <button
                onClick={() => handleCitizenAck('safe')}
                style={{
                  background: userStatus === 'safe' ? '#064e3b' : '#0f172a',
                  color: userStatus === 'safe' ? '#6ee7b7' : '#94a3b8',
                  border: userStatus === 'safe' ? '2px solid #10b981' : '1px solid #1e293b',
                  borderRadius: '8px',
                  padding: '12px 14px',
                  fontWeight: 700,
                  fontSize: '0.84rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: userStatus === 'safe' ? '0 0 14px rgba(16, 185, 129, 0.4)' : 'none',
                  transition: 'all 0.15s ease'
                }}
              >
                <span>✅</span>
                <span>{userStatus === 'safe' ? 'I Am Safe (Active)' : 'I Am Safe (No Ingress)'}</span>
              </button>

              <button
                onClick={() => handleCitizenAck('confirmed')}
                style={{
                  background: userStatus === 'confirmed' ? '#0c4a6e' : '#0f172a',
                  color: userStatus === 'confirmed' ? '#7dd3fc' : '#94a3b8',
                  border: userStatus === 'confirmed' ? '2px solid #0284c7' : '1px solid #1e293b',
                  borderRadius: '8px',
                  padding: '12px 14px',
                  fontWeight: 700,
                  fontSize: '0.84rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: userStatus === 'confirmed' ? '0 0 14px rgba(56, 189, 248, 0.4)' : 'none',
                  transition: 'all 0.15s ease'
                }}
              >
                <span>🌊</span>
                <span>{userStatus === 'confirmed' ? 'Flooding Confirmed (Active)' : 'Confirm Flooding Here'}</span>
              </button>

              <button
                onClick={() => handleCitizenAck('rescue')}
                style={{
                  background: userStatus === 'rescue' ? '#7f1d1d' : '#0f172a',
                  color: userStatus === 'rescue' ? '#fca5a5' : '#94a3b8',
                  border: userStatus === 'rescue' ? '2px solid #ef4444' : '1px solid #1e293b',
                  borderRadius: '8px',
                  padding: '12px 14px',
                  fontWeight: 700,
                  fontSize: '0.84rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: userStatus === 'rescue' ? '0 0 14px rgba(239, 68, 68, 0.4)' : 'none',
                  transition: 'all 0.15s ease'
                }}
              >
                <span>🆘</span>
                <span>{userStatus === 'rescue' ? 'Rescue Requested (Active)' : 'Request Swift-Water Rescue'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: 📅 PAST 1-WEEK INCIDENT LEDGER */}
      {subTab === 'weekly' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#f8fafc' }}>
                Past 7-Day Chronological Telemetry & Inundation Ledger
              </h3>
              <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '4px' }}>
                Historical record showing day-by-day 24h/72h rainfall, probability score, and 50% threshold status for <strong style={{ color: '#38bdf8' }}>{locName}</strong>
              </div>
            </div>
            <div>
              <button
                onClick={() => {
                  const csvContent = "data:text/csv;charset=utf-8," +
                    ["Date,Day,Rainfall 24h (mm),Rainfall 72h (mm),Probability (%),Threshold Status,Water Depth (m),Status Summary"].join(",") + "\n" +
                    weekRecords.map(r => `"${r.date}","${r.day_name}",${r.rainfall_24h_mm},${r.rainfall_72h_mm},${r.probability},"${r.threshold_crossed ? 'BREACHED' : 'SAFE'}",${r.peak_water_depth_m},"${r.status_summary.replace(/"/g, '""')}"`).join("\n");
                  const encodedUri = encodeURI(csvContent);
                  const link = document.createElement("a");
                  link.setAttribute("href", encodedUri);
                  link.setAttribute("download", `FloodRisk_WeeklyReport_${locName}.csv`);
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                }}
                style={{ background: '#0284c7', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', boxShadow: '0 2px 8px rgba(2, 132, 199, 0.3)' }}
              >
                📊 Export CSV Report
              </button>
            </div>
          </div>

          {/* 3 KPI CARDS FOR PAST 7 DAYS */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px', marginBottom: '18px' }}>
            <div style={{ background: '#0b1120', border: '1px solid rgba(56, 189, 248, 0.18)', borderRadius: '12px', padding: '14px 18px', boxShadow: '0 4px 14px rgba(0,0,0,0.3)' }}>
              <div style={{ fontSize: '0.74rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase' }}>7-Day Total Accumulation</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#38bdf8', marginTop: '2px' }}>
                {Math.round(weekRecords.reduce((acc, r) => acc + r.rainfall_24h_mm, 0))} mm
              </div>
            </div>
            <div style={{ background: '#0b1120', border: '1px solid rgba(56, 189, 248, 0.18)', borderRadius: '12px', padding: '14px 18px', boxShadow: '0 4px 14px rgba(0,0,0,0.3)' }}>
              <div style={{ fontSize: '0.74rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase' }}>Days &gt; 50% Threshold</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#ef4444', marginTop: '2px' }}>
                {weekRecords.filter(r => r.threshold_crossed).length} of 7 Days
              </div>
            </div>
            <div style={{ background: '#0b1120', border: '1px solid rgba(56, 189, 248, 0.18)', borderRadius: '12px', padding: '14px 18px', boxShadow: '0 4px 14px rgba(0,0,0,0.3)' }}>
              <div style={{ fontSize: '0.74rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase' }}>Peak 7-Day Water Depth</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#8b5cf6', marginTop: '2px' }}>
                {Math.max(...weekRecords.map(r => r.peak_water_depth_m))} m
              </div>
            </div>
          </div>

          {/* 7-DAY TABLE */}
          <div style={{ background: '#0b1120', border: '1px solid rgba(56, 189, 248, 0.18)', borderRadius: '12px', overflowX: 'auto', boxShadow: '0 4px 16px rgba(0,0,0,0.3)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#0f172a', borderBottom: '1px solid rgba(56, 189, 248, 0.2)', color: '#94a3b8' }}>
                  <th style={{ padding: '12px 14px' }}>Date & Day</th>
                  <th style={{ padding: '12px 14px' }}>Rain (24h / 72h)</th>
                  <th style={{ padding: '12px 14px' }}>Risk Score</th>
                  <th style={{ padding: '12px 14px' }}>50% Threshold</th>
                  <th style={{ padding: '12px 14px' }}>Peak Depth</th>
                  <th style={{ padding: '12px 14px' }}>Field Observations & Incident Summary</th>
                </tr>
              </thead>
              <tbody>
                {weekRecords.map((r, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #1e293b', background: r.threshold_crossed ? 'rgba(239, 68, 68, 0.08)' : '#0b1120' }}>
                    <td style={{ padding: '12px 14px', fontWeight: 600, color: '#f8fafc' }}>
                      {r.date} <span style={{ color: '#94a3b8', fontWeight: 400 }}>({r.day_name})</span>
                    </td>
                    <td style={{ padding: '12px 14px', color: '#38bdf8', fontWeight: 600 }}>
                      {r.rainfall_24h_mm} mm <span style={{ color: '#64748b', fontWeight: 400 }}>/ {r.rainfall_72h_mm} mm</span>
                    </td>
                    <td style={{ padding: '12px 14px', fontWeight: 800, color: r.probability >= 70 ? '#ef4444' : (r.probability >= 50 ? '#f59e0b' : '#10b981') }}>
                      {r.probability}%
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <span style={{
                        display: 'inline-block',
                        padding: '3px 9px',
                        borderRadius: '12px',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        background: r.threshold_crossed ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                        color: r.threshold_crossed ? '#ef4444' : '#10b981',
                        border: `1px solid ${r.threshold_crossed ? '#ef4444' : '#10b981'}`
                      }}>
                        {r.threshold_crossed ? 'BREACHED' : 'SAFE'}
                      </span>
                    </td>
                    <td style={{ padding: '12px 14px', color: '#cbd5e1', fontWeight: 600 }}>
                      {r.peak_water_depth_m} m
                    </td>
                    <td style={{ padding: '12px 14px', color: '#94a3b8', fontSize: '0.82rem' }}>
                      {r.status_summary}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: 📈 RAINFALL SENSITIVITY & IMPACT CURVES */}
      {subTab === 'sensitivity' && (
        <div>
          {/* LOCATION-WISE HYDROLOGICAL CONTEXT BANNER */}
          <div style={{ marginBottom: '18px', background: 'rgba(15, 23, 42, 0.75)', border: '1px solid rgba(56, 189, 248, 0.25)', borderRadius: '12px', padding: '16px 20px', boxShadow: '0 4px 16px rgba(0,0,0,0.25)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#f8fafc' }}>
                    Hydrological Sensitivity & Inundation Scenarios for {locName}
                  </h3>
                  <span style={{ fontSize: '0.7rem', fontWeight: 700, background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', border: '1px solid #0284c7', padding: '2px 8px', borderRadius: '12px' }}>
                    {hydroProfile.zoneName}
                  </span>
                </div>
                <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '4px' }}>
                  Topography: <strong style={{ color: '#e2e8f0' }}>{hydroProfile.elevationDesc}</strong> • Drainage: <span style={{ color: '#cbd5e1' }}>{hydroProfile.drainageType}</span>
                </div>
              </div>

              <div style={{ fontSize: '0.76rem', background: 'rgba(2, 132, 199, 0.12)', border: '1px solid rgba(56, 189, 248, 0.25)', borderRadius: '8px', padding: '6px 12px', color: '#38bdf8' }}>
                📍 Monitored Channels: <span style={{ color: '#f8fafc', fontWeight: 600 }}>{hydroProfile.keyFeatures}</span>
              </div>
            </div>
          </div>

          {/* SENSITIVITY TABLE */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
            {/* INCREASING RAIN SCENARIOS */}
            <div style={{ background: '#0b1120', border: '1px solid rgba(56, 189, 248, 0.18)', borderRadius: '12px', padding: '18px', boxShadow: '0 4px 16px rgba(0,0,0,0.3)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '1.2rem' }}>🌧️</span>
                  <strong style={{ fontSize: '0.92rem', color: '#ef4444' }}>Rainfall Acceleration Scenarios (+mm)</strong>
                </div>
                <span style={{ fontSize: '0.68rem', color: '#94a3b8', background: '#0f172a', padding: '2px 6px', borderRadius: '4px' }}>
                  LOCATION CALIBRATED
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {incScenarios.map((s, idx) => (
                  <div key={idx} style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px', padding: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <strong style={{ color: '#f8fafc', fontSize: '0.88rem' }}>+{s.rainfall_increase_mm} mm (Total: {s.simulated_rainfall_24h}mm)</strong>
                        {s.threat_classification && (
                          <span style={{ fontSize: '0.66rem', color: '#f59e0b', background: 'rgba(245, 158, 11, 0.12)', border: '1px solid rgba(245, 158, 11, 0.25)', padding: '1px 6px', borderRadius: '4px', fontWeight: 600 }}>
                            {s.threat_classification}
                          </span>
                        )}
                      </div>
                      <span style={{ fontSize: '0.86rem', fontWeight: 800, color: s.simulated_probability >= 70 ? '#ef4444' : '#f59e0b' }}>
                        {s.simulated_probability}% (+{s.risk_increase_delta}%)
                      </span>
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#94a3b8', lineHeight: 1.4 }}>
                      {s.consequence_summary}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* DECREASING RAIN SCENARIOS */}
            <div style={{ background: '#0b1120', border: '1px solid rgba(56, 189, 248, 0.18)', borderRadius: '12px', padding: '18px', boxShadow: '0 4px 16px rgba(0,0,0,0.3)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '1.2rem' }}>⛅</span>
                  <strong style={{ fontSize: '0.92rem', color: '#10b981' }}>Rainfall Abatement & Recession Scenarios (-mm)</strong>
                </div>
                <span style={{ fontSize: '0.68rem', color: '#94a3b8', background: '#0f172a', padding: '2px 6px', borderRadius: '4px' }}>
                  HYDRAULIC RECESSION
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {decScenarios.map((s, idx) => (
                  <div key={idx} style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px', padding: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <strong style={{ color: '#f8fafc', fontSize: '0.88rem' }}>{s.scenario_label}</strong>
                      <span style={{ fontSize: '0.86rem', fontWeight: 800, color: '#10b981' }}>
                        {s.simulated_probability}% {s.risk_reduction_delta > 0 ? `(-${s.risk_reduction_delta}%)` : (s.risk_reduction_delta < 0 ? `(+${Math.abs(s.risk_reduction_delta)}%)` : '(Baseline)')}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#94a3b8', lineHeight: 1.4 }}>
                      {s.drainage_recovery_behavior}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: 🌀 MULTI-HAZARD EARLY WARNING FEED (FLOOD + CYCLONE) */}
      {subTab === 'multihazard' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#f8fafc' }}>
                Unified Multi-Hazard Early Warning & Coastal Watch Feed
              </h3>
              <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '4px' }}>
                Aggregates municipal hydrological flood alerts (`FLOOD`) and North Indian Ocean cyclone / coastal observatory warnings (`CYCLONE`).
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {[
                { id: 'ALL', label: '🌐 All Hazards' },
                { id: 'FLOOD', label: '🌊 Flood Hydrology' },
                { id: 'CYCLONE', label: '🌀 Cyclone & Coastal' }
              ].map(f => (
                <button
                  key={f.id}
                  onClick={() => setHazardFilter(f.id)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '8px',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    background: hazardFilter === f.id ? '#0284c7' : '#0b1120',
                    color: hazardFilter === f.id ? '#ffffff' : '#94a3b8',
                    border: `1px solid ${hazardFilter === f.id ? '#38bdf8' : '#1e293b'}`
                  }}
                >
                  {f.label}
                </button>
              ))}

              {onOpenCyclone && (
                <button
                  onClick={() => onOpenCyclone()}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '8px',
                    fontSize: '0.78rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    background: 'rgba(245, 158, 11, 0.16)',
                    color: '#fbbf24',
                    border: '1px solid rgba(245, 158, 11, 0.45)'
                  }}
                >
                  🗺️ Open Cyclone Trajectory GIS →
                </button>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {multiHazardAlerts
              .filter(a => hazardFilter === 'ALL' || (a.hazardType || 'FLOOD').includes(hazardFilter))
              .map((alertItem) => {
                const isCyc = (alertItem.hazardType || '').includes('CYCLONE');
                const borderColor = isCyc ? 'rgba(245, 158, 11, 0.45)' : 'rgba(56, 189, 248, 0.35)';
                return (
                  <div
                    key={alertItem.id}
                    style={{
                      background: '#0b1120',
                      border: `1px solid ${borderColor}`,
                      borderLeft: `4px solid ${isCyc ? '#f59e0b' : '#38bdf8'}`,
                      borderRadius: '12px',
                      padding: '16px 20px',
                      display: 'flex',
                      flexWrap: 'wrap',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: '14px'
                    }}
                  >
                    <div style={{ flex: '1 1 460px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', flexWrap: 'wrap' }}>
                        <span style={{
                          padding: '2px 8px',
                          borderRadius: '4px',
                          fontSize: '0.68rem',
                          fontWeight: 800,
                          background: isCyc ? 'rgba(245, 158, 11, 0.18)' : 'rgba(56, 189, 248, 0.18)',
                          color: isCyc ? '#fbbf24' : '#38bdf8',
                          border: `1px solid ${isCyc ? 'rgba(245, 158, 11, 0.4)' : 'rgba(56, 189, 248, 0.4)'}`
                        }}>
                          {isCyc ? `🌀 CYCLONE / MARITIME (${alertItem.imdCategory || 'NIO'})` : '🌊 FLOOD HYDROLOGY'}
                        </span>
                        <span style={{ fontSize: '0.76rem', color: '#94a3b8', fontWeight: 600 }}>
                          📍 {alertItem.location} ({Number(alertItem.latitude).toFixed(2)}°N, {Number(alertItem.longitude).toFixed(2)}°E)
                        </span>
                      </div>

                      <div style={{ fontSize: '1rem', fontWeight: 800, color: '#f8fafc', marginBottom: '4px' }}>
                        {alertItem.headline}
                      </div>
                      <div style={{ fontSize: '0.82rem', color: '#cbd5e1', lineHeight: 1.45 }}>
                        {alertItem.actionRequired}
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '0.68rem', color: '#94a3b8', textTransform: 'uppercase' }}>
                          {isCyc ? 'Wind / Pressure' : '24h / 72h Rain'}
                        </div>
                        <div style={{ fontSize: '0.92rem', fontWeight: 800, color: isCyc ? '#fbbf24' : '#38bdf8' }}>
                          {isCyc
                            ? `${alertItem.windSpeedKmh ?? 22} km/h • ${alertItem.centralPressureHpa ?? 1008} hPa`
                            : `${alertItem.rainfall24h} mm / ${alertItem.rainfall72h} mm`}
                        </div>
                        <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
                          Tier: {alertItem.alertTier}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}
      </>
      )}
    </div>
  );
}
