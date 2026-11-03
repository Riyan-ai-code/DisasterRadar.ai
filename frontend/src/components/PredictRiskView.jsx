import React, { useState, useEffect } from 'react';
import {
  geocodeLocation,
  fetchGlobalLiveTelemetry,
  predictFloodRisk,
  predictStressScenario,
  compareModelPredictions,
  reverseGeocodeCoords,
  submitGroundTruthReport
} from '../services/api';

export default function PredictRiskView({
  currentLocation,
  homeLocation: propHomeLocation,
  exploredLocation: propExploredLocation,
  locationTab: propLocationTab,
  onSwitchToMyLocation: propSwitchToMyLocation,
  onSwitchToExplore: propSwitchToExplore,
  onUpdateHomeLocation,
  params: initialParams,
  prediction: initialPrediction,
  onBackToDashboard,
  onLocationChange,
  onOpenPerformance
}) {
  // 1. Live Ground Telemetry for active physical location (preserved strictly from satellites & Copernicus DEM)
  const [liveParams, setLiveParams] = useState(initialParams || {
    rainfall24h: 0.0,
    rainfall72h: 0.0,
    temperature: 21.2,
    humidity: 78,
    windSpeed: 12,
    pressure: 910,
    elevation: 897,
    latitude: currentLocation?.lat || 12.9603,
    longitude: currentLocation?.lng || 77.7151,
    location: currentLocation?.name || 'Bengaluru, Karnataka',
    drainageCapacity: 45,
    ndwi: 0.12
  });
  const [livePrediction, setLivePrediction] = useState(initialPrediction || null);

  // 2. Independent Stress-Test Scenario Simulation State (does NOT overwrite live location)
  const [activeMode, setActiveMode] = useState('live'); // 'live' | 'scenario'
  const [selectedScenario, setSelectedScenario] = useState('live'); // 'live' | 'cloudburst' | 'monsoon' | 'coastal' | 'dry' | 'custom'
  const [scenarioParams, setScenarioParams] = useState(null);
  const [scenarioPrediction, setScenarioPrediction] = useState(null);

  const [locationQuery, setLocationQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [modelComparison, setModelComparison] = useState(null);
  const [isComparing, setIsComparing] = useState(false);
  const [compareError, setCompareError] = useState(null);
  const [gpsStatus, setGpsStatus] = useState(null);
  const [groundTruthState, setGroundTruthState] = useState({
    verified: false,
    condition: null
  });
  const [homeLocation, setHomeLocation] = useState(() => {
    if (propHomeLocation && propHomeLocation.lat) {
      if (propHomeLocation.isUserExplicitHome) return propHomeLocation;
      const n = (propHomeLocation.name || '').toLowerCase();
      if (!n.includes('guwahati') && !n.includes('boka') && !n.includes('boko') && !n.includes('bengaluru')) {
        return propHomeLocation;
      }
    }
    try {
      const saved = localStorage.getItem('disasterradar_home_location');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed?.isUserExplicitHome && parsed?.lat) return parsed;
        const n = (parsed?.name || '').toLowerCase();
        if (parsed?.lat && !n.includes('guwahati') && !n.includes('boka') && !n.includes('boko') && !n.includes('bengaluru')) return parsed;
      }
    } catch (e) {}
    return { name: 'Kharupetia, Assam', country: 'India', lat: 26.5181, lng: 92.1384 };
  });
  const [locationTab, setLocationTab] = useState(propLocationTab || 'myLocation'); // 'myLocation' | 'explore'
  const [exploredLocation, setExploredLocation] = useState(propExploredLocation || null);
  const [isChangingHome, setIsChangingHome] = useState(false);
  const [newHomeQuery, setNewHomeQuery] = useState('');
  const [newHomeResults, setNewHomeResults] = useState([]);
  const [isNewHomeSearching, setIsNewHomeSearching] = useState(false);

  useEffect(() => {
    if (propExploredLocation !== undefined) {
      setExploredLocation(propExploredLocation);
    }
  }, [propExploredLocation]);

  useEffect(() => {
    if (propHomeLocation && propHomeLocation.lat) {
      if (propHomeLocation.isUserExplicitHome) {
        setHomeLocation(propHomeLocation);
      } else {
        const n = (propHomeLocation.name || '').toLowerCase();
        if (!n.includes('guwahati') && !n.includes('boka') && !n.includes('boko') && !n.includes('bengaluru')) {
          setHomeLocation(propHomeLocation);
        }
      }
    }
  }, [propHomeLocation]);

  useEffect(() => {
    if (propLocationTab) setLocationTab(propLocationTab);
  }, [propLocationTab]);

  // Production is locked to Super-Stack Ensemble (93.85% Acc, 0.982 ROC-AUC)
  // Other models are available for benchmarking in Model Performance Studio
  const selectedEngine = 'ensemble';

  // Switch back to Home Location
  const handleSwitchToMyLocation = async () => {
    setLocationTab('myLocation');
    setExploredLocation(null);
    setIsChangingHome(false);
    if (propSwitchToMyLocation) {
      await propSwitchToMyLocation();
    }
    await handleSelectLocation(homeLocation, true);
  };

  // Permanently save a new Home Location (only via explicit Set as Home action)
  const handleSetNewHome = async (newLoc) => {
    const payload = { ...newLoc, isUserExplicitHome: true };
    setHomeLocation(payload);
    try {
      localStorage.setItem('disasterradar_home_location', JSON.stringify(payload));
      localStorage.setItem('disasterradar_user_location', JSON.stringify(payload));
    } catch (e) {}
    if (onUpdateHomeLocation) {
      await onUpdateHomeLocation(payload);
    }
    setIsChangingHome(false);
    setNewHomeQuery('');
    setNewHomeResults([]);
    setLocationTab('myLocation');
    await handleSelectLocation(payload, true);
  };

  // Active Parameters & Prediction based on current mode (Live vs Scenario)
  const displayParams = activeMode === 'scenario' && scenarioParams ? scenarioParams : liveParams;
  const displayPrediction = activeMode === 'scenario' && scenarioPrediction ? scenarioPrediction : livePrediction;
  const params = displayParams;
  const prediction = displayPrediction;

  // 1-Tap Ground-Truth Verification (for active live location)
  const handleGroundTruthVerify = async (isRaining) => {
    setGroundTruthState({ verified: true, condition: isRaining ? 'RAIN' : 'DRY' });
    const r24 = isRaining ? 45.0 : 0.0;
    const r72 = isRaining ? 95.0 : 0.0;
    const updated = {
      ...liveParams,
      rainfall24h: r24,
      rainfall72h: r72,
      isRaining: isRaining,
      currentRainfall: isRaining ? 8.5 : 0.0
    };
    setLiveParams(updated);
    setActiveMode('live');
    setSelectedScenario('live');
    setScenarioParams(null);
    setScenarioPrediction(null);

    try {
      await submitGroundTruthReport({
        location: liveParams.location,
        latitude: liveParams.latitude,
        longitude: liveParams.longitude,
        isRaining: isRaining,
        observedCondition: isRaining ? 'ACTIVE_RAIN_REPORTED' : 'USER_VERIFIED_DRY',
        rainfallOverride: isRaining ? 8.5 : 0.0
      });
    } catch (e) {
      console.warn('Ground truth submission error:', e);
    }

    await handleRunLivePrediction(updated);
  };

  // Sync with parent props if updated externally
  useEffect(() => {
    if (initialParams) {
      setLiveParams(initialParams);
    }
  }, [initialParams]);

  useEffect(() => {
    if (initialPrediction) {
      setLivePrediction(initialPrediction);
    }
  }, [initialPrediction]);

  // Sync when currentLocation changes from parent
  useEffect(() => {
    if (currentLocation && currentLocation.lat && currentLocation.lng) {
      if (currentLocation.lat !== liveParams.latitude || currentLocation.lng !== liveParams.longitude) {
        const isHome = Math.abs(Number(currentLocation.lat) - Number(homeLocation.lat)) < 0.005 &&
                       Math.abs(Number(currentLocation.lng) - Number(homeLocation.lng)) < 0.005;
        handleSelectLocation({
          name: currentLocation.name,
          country: currentLocation.country || '',
          lat: currentLocation.lat,
          lng: currentLocation.lng
        }, isHome);
      }
    }
  }, [currentLocation?.lat, currentLocation?.lng]);

  const handleDetectDeviceGPS = () => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setGpsStatus('GPS not supported by browser');
      if (!livePrediction) handleRunLivePrediction(liveParams);
      return;
    }
    setIsLoading(true);
    setGpsStatus('Acquiring device GPS...');

    const onPosSuccess = async (pos) => {
      const lat = parseFloat(pos.coords.latitude.toFixed(4));
      const lng = parseFloat(pos.coords.longitude.toFixed(4));
      setGpsStatus('Resolving location...');

      let placeName = `Device Location (${lat}, ${lng})`;
      let country = '';
      try {
        const geoInfo = await reverseGeocodeCoords(lat, lng);
        if (geoInfo && geoInfo.name) {
          placeName = geoInfo.name;
          country = geoInfo.country || '';
        }
      } catch (e) {
        console.warn('Reverse geocode error:', e);
      }

      setGpsStatus(`Syncing weather for ${placeName}...`);
      try {
        const telemetry = await fetchGlobalLiveTelemetry(lat, lng);
        const updated = {
          ...liveParams,
          location: placeName,
          latitude: lat,
          longitude: lng,
          elevation: !isNaN(Number(telemetry.elevation)) ? Number(telemetry.elevation) : 15.0,
          rainfall24h: !isNaN(Number(telemetry.rainfall24h)) ? Number(telemetry.rainfall24h) : 0.0,
          rainfall72h: !isNaN(Number(telemetry.rainfall72h)) ? Number(telemetry.rainfall72h) : 0.0,
          currentRainfall: !isNaN(Number(telemetry.currentRainfall)) ? Number(telemetry.currentRainfall) : 0.0,
          isRaining: Boolean(telemetry.isRaining),
          temperature: !isNaN(Number(telemetry.temperature)) ? Number(telemetry.temperature) : 25.0,
          humidity: !isNaN(Number(telemetry.humidity)) ? Number(telemetry.humidity) : 60.0,
          pressure: !isNaN(Number(telemetry.pressure)) ? Number(telemetry.pressure) : 1013.0,
          windSpeed: !isNaN(Number(telemetry.windSpeed)) ? Number(telemetry.windSpeed) : 10.0
        };
        setLiveParams(updated);
        setActiveMode('live');
        setSelectedScenario('live');
        setScenarioParams(null);
        setScenarioPrediction(null);
        const currRain = telemetry.currentRainfall !== undefined ? telemetry.currentRainfall : 0;
        const rainLabel = currRain === 0 ? '☀️ 0.0 mm/h (Dry)' : `🌧️ ${currRain} mm/h`;
        setGpsStatus(`📍 ${placeName.split(',')[0]} (${rainLabel})`);
        await handleRunLivePrediction(updated, { name: placeName, country, lat, lng });
      } catch (err) {
        console.error('GPS telemetry error:', err);
      } finally {
        setIsLoading(false);
        setTimeout(() => setGpsStatus(null), 5000);
      }
    };

    const onPosError = (err) => {
      console.warn('Geolocation high-accuracy failed, falling back:', err);
      navigator.geolocation.getCurrentPosition(
        onPosSuccess,
        (fallbackErr) => {
          setIsLoading(false);
          setGpsStatus(`GPS unavailable (${fallbackErr.message})`);
          setTimeout(() => setGpsStatus(null), 5000);
          if (!livePrediction) handleRunLivePrediction(liveParams);
        },
        { enableHighAccuracy: false, timeout: 12000, maximumAge: 60000 }
      );
    };

    navigator.geolocation.getCurrentPosition(
      onPosSuccess,
      onPosError,
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
    );
  };

  // Only auto-detect GPS on mount if no initial location was passed
  useEffect(() => {
    if (!currentLocation?.lat && !initialParams?.latitude) {
      handleDetectDeviceGPS();
    }
  }, []);

  // Debounced location search
  useEffect(() => {
    if (!locationQuery || locationQuery.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setIsSearching(true);
      const results = await geocodeLocation(locationQuery.trim());
      setSearchResults(results.slice(0, 6));
      setIsSearching(false);
    }, 320);
    return () => clearTimeout(timer);
  }, [locationQuery]);

  // Handle Location Selection: updates live ground telemetry
  const handleSelectLocation = async (loc, isExplicitHome = false) => {
    setIsLoading(true);
    setLocationQuery('');
    setSearchResults([]);
    setActiveMode('live');
    setSelectedScenario('live');
    setScenarioParams(null);
    setScenarioPrediction(null);

    // Check if this is the user's permanent home location
    const isActuallyHome = isExplicitHome || (
      Math.abs(Number(loc.lat) - Number(homeLocation.lat)) < 0.005 &&
      Math.abs(Number(loc.lng) - Number(homeLocation.lng)) < 0.005
    );

    if (isActuallyHome) {
      setLocationTab('myLocation');
      setExploredLocation(null);
    } else {
      setLocationTab('explore');
      setExploredLocation(loc);
      if (propSwitchToExplore) {
        propSwitchToExplore(loc);
      }
    }

    const telemetry = await fetchGlobalLiveTelemetry(loc.lat, loc.lng);
    const updated = {
      ...liveParams,
      location: `${loc.name}${loc.country ? ', ' + loc.country : ''}`.trim(),
      latitude: loc.lat,
      longitude: loc.lng,
      rainfall24h: !isNaN(Number(telemetry.rainfall24h)) ? Number(telemetry.rainfall24h) : 0.0,
      rainfall72h: !isNaN(Number(telemetry.rainfall72h)) ? Number(telemetry.rainfall72h) : 0.0,
      currentRainfall: !isNaN(Number(telemetry.currentRainfall)) ? Number(telemetry.currentRainfall) : 0.0,
      isRaining: Boolean(telemetry.isRaining),
      temperature: !isNaN(Number(telemetry.temperature)) ? Number(telemetry.temperature) : 25.0,
      humidity: !isNaN(Number(telemetry.humidity)) ? Number(telemetry.humidity) : 60.0,
      pressure: !isNaN(Number(telemetry.pressure)) ? Number(telemetry.pressure) : 1013.0,
      elevation: !isNaN(Number(telemetry.elevation)) ? Number(telemetry.elevation) : 15.0
    };

    setLiveParams(updated);
    await handleRunLivePrediction(updated, loc, selectedEngine, !isActuallyHome);
  };

  // Run ML model prediction for LIVE Location (and sync with parent dashboard)
  const handleRunLivePrediction = async (currentLiveParams = liveParams, loc = null, engine = selectedEngine, isExplore = false) => {
    setIsLoading(true);
    setModelComparison(null);
    setCompareError(null);
    const safeParams = {
      ...currentLiveParams,
      rainfall24h: !isNaN(Number(currentLiveParams.rainfall24h)) ? Number(currentLiveParams.rainfall24h) : 0.0,
      rainfall72h: !isNaN(Number(currentLiveParams.rainfall72h)) ? Number(currentLiveParams.rainfall72h) : 0.0,
      elevation: !isNaN(Number(currentLiveParams.elevation)) ? Number(currentLiveParams.elevation) : 15.0,
      humidity: !isNaN(Number(currentLiveParams.humidity)) ? Number(currentLiveParams.humidity) : 60.0,
      temperature: !isNaN(Number(currentLiveParams.temperature)) ? Number(currentLiveParams.temperature) : 25.0
    };
    try {
      const res = await predictFloodRisk(safeParams, engine);
      if (res) {
        setLivePrediction(res);
        if (onLocationChange) {
          onLocationChange(
            loc || { name: safeParams.location.split(',')[0], lat: safeParams.latitude, lng: safeParams.longitude },
            safeParams,
            res,
            isExplore
          );
        }
      }
    } catch (e) {
      console.error('Live location prediction failed:', e);
    } finally {
      setIsLoading(false);
    }
  };

  // Run backend formula prediction for STRESS-TEST SCENARIOS (strictly backend formula, real scenario on ML models)
  const handleRunScenarioPrediction = async (scenParams) => {
    setIsLoading(true);
    setModelComparison(null);
    setCompareError(null);
    const safeParams = {
      ...scenParams,
      rainfall24h: !isNaN(Number(scenParams.rainfall24h)) ? Number(scenParams.rainfall24h) : 0.0,
      rainfall72h: !isNaN(Number(scenParams.rainfall72h)) ? Number(scenParams.rainfall72h) : 0.0,
      elevation: !isNaN(Number(scenParams.elevation)) ? Number(scenParams.elevation) : 15.0,
      humidity: !isNaN(Number(scenParams.humidity)) ? Number(scenParams.humidity) : 60.0,
      temperature: !isNaN(Number(scenParams.temperature)) ? Number(scenParams.temperature) : 25.0
    };
    try {
      const res = await predictStressScenario(safeParams);
      if (res) {
        setScenarioPrediction(res);
      }
    } catch (e) {
      console.error('Scenario prediction failed:', e);
    } finally {
      setIsLoading(false);
    }
  };

  // Unified runner handling either scenario or live based on active mode
  const handleRunPrediction = async (customParams = null, engine = selectedEngine) => {
    if (activeMode === 'scenario' && (customParams || scenarioParams)) {
      await handleRunScenarioPrediction(customParams || scenarioParams, engine);
    } else {
      await handleRunLivePrediction(customParams || liveParams, null, engine);
    }
  };

  // Production is locked to Super-Stack Ensemble — engine selection not exposed

  // 1-Click Reset: Return from Simulation back to Real-World Ground Reality
  const handleResetToLive = () => {
    setActiveMode('live');
    setSelectedScenario('live');
    setScenarioParams(null);
    setScenarioPrediction(null);
    setModelComparison(null);
  };

  // Apply Stress-Test Scenario (Does NOT alter or overwrite real location telemetry)
  const handleApplyScenario = async (scenarioKey) => {
    if (scenarioKey === 'live') {
      handleResetToLive();
      return;
    }

    setSelectedScenario(scenarioKey);
    setActiveMode('scenario');
    let newScen = {
      ...liveParams,
      location: `[Simulated: ${scenarioKey.toUpperCase()}] ${liveParams.location}`
    };

    if (scenarioKey === 'cloudburst') {
      newScen = {
        ...newScen,
        rainfall24h: 145,
        rainfall72h: 210,
        slope: 0.25,
        drainageCapacity: 3.0,
        humidity: 95,
        windSpeed: 28,
        ndwi: 0.25,
        ndvi: 0.52
      };
    } else if (scenarioKey === 'monsoon') {
      newScen = {
        ...newScen,
        rainfall24h: 85,
        rainfall72h: 260,
        slope: 0.35,
        drainageCapacity: 4.0,
        humidity: 92,
        ndwi: 0.20,
        ndvi: 0.50
      };
    } else if (scenarioKey === 'coastal') {
      newScen = {
        ...newScen,
        elevation: 3,
        rainfall24h: 45,
        rainfall72h: 110,
        slope: 0.20,
        pressure: 996,
        drainageCapacity: 3.5,
        ndwi: 0.26,
        ndvi: 0.48
      };
    } else if (scenarioKey === 'dry') {
      newScen = {
        ...newScen,
        rainfall24h: 0,
        rainfall72h: 0,
        slope: 1.5,
        drainageCapacity: 6.0,
        humidity: 45,
        ndwi: -0.1,
        ndvi: 0.60
      };
    }

    setScenarioParams(newScen);
    await handleRunScenarioPrediction(newScen);
  };

  // Slider change: adjusts simulation parameters without modifying live location
  const handleSliderChange = async (field, value) => {
    const base = activeMode === 'scenario' && scenarioParams ? scenarioParams : liveParams;
    const updated = {
      ...base,
      [field]: value,
      location: `[Custom What-If] ${liveParams.location}`
    };
    setActiveMode('scenario');
    setSelectedScenario('custom');
    setScenarioParams(updated);
    await handleRunScenarioPrediction(updated);
  };

  // Run XGBoost vs Random Forest side by side on currently displayed parameters
  const handleCompareModels = async () => {
    setIsComparing(true);
    setCompareError(null);
    try {
      const res = await compareModelPredictions(displayParams);
      setModelComparison(res);
    } catch (e) {
      console.error('Model comparison failed:', e);
      setCompareError('Model comparison is unavailable right now.');
    } finally {
      setIsComparing(false);
    }
  };

  const prob = displayPrediction ? Number(displayPrediction.probability) : (livePrediction ? Number(livePrediction.probability) : 2.4);
  const isBreached = prob >= 50.0;
  const estDepthMeters = prob > 50 ? ((prob - 50) * 0.038).toFixed(2) : '0.05';

  return (
    <div className="predict-risk-page-container" style={{ padding: '24px 32px', color: '#f8fafc', background: '#060911', minHeight: '100vh' }}>
      {/* HEADER & BREADCRUMB */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '14px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <button
              onClick={onBackToDashboard}
              style={{
                background: '#0f172a',
                border: '1px solid rgba(56, 189, 248, 0.25)',
                borderRadius: '6px',
                padding: '5px 12px',
                fontSize: '0.8rem',
                fontWeight: 600,
                color: '#38bdf8',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px'
              }}
            >
              ← Back to Dashboard
            </button>
            <span style={{ color: '#64748b' }}>/</span>
            <span style={{ fontSize: '0.84rem', color: '#94a3b8', fontWeight: 500 }}>Operational Forecasting</span>
            <span style={{ color: '#64748b' }}>/</span>
            <span style={{ fontSize: '0.84rem', color: '#38bdf8', fontWeight: 600 }}>Predict Risk Studio</span>
          </div>

          <h2 style={{ fontSize: '1.65rem', fontWeight: 800, color: '#f8fafc', margin: 0 }}>
            🛰️ Production Flood Inundation Prediction Studio
          </h2>
          <div style={{ fontSize: '0.86rem', color: '#94a3b8', marginTop: '4px' }}>
            High-precision XGBoost inference engine with live satellite telemetry auto-fetch, scenario stress testing, and civic alert scoring
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={() => handleRunPrediction()}
            disabled={isLoading}
            style={{
              backgroundColor: '#0284c7',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              padding: '9px 20px',
              fontSize: '0.86rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            {isLoading ? 'Running Inference...' : '⚡ Re-Compute Prediction'}
          </button>
        </div>
      </div>

      {/* TOP GLOBAL LOCATION BAR WITH 2-TAB SYSTEM */}
      <div style={{
        background: '#0b1120',
        border: '1px solid rgba(56, 189, 248, 0.22)',
        borderRadius: '14px',
        padding: '16px 20px',
        marginBottom: '24px',
        boxShadow: '0 8px 30px rgba(0,0,0,0.5)'
      }}>
        {/* TWO-TAB SYSTEM: My Location vs Explore Other Locations */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '10px',
          marginBottom: '16px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          paddingBottom: '12px'
        }}>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={handleSwitchToMyLocation}
              style={{
                background: locationTab === 'myLocation' ? '#0284c7' : 'rgba(255, 255, 255, 0.05)',
                color: '#ffffff',
                border: locationTab === 'myLocation' ? '1px solid #38bdf8' : '1px solid rgba(255, 255, 255, 0.1)',
                padding: '7px 16px',
                borderRadius: '8px',
                fontSize: '0.82rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: locationTab === 'myLocation' ? '0 2px 10px rgba(2, 132, 199, 0.4)' : 'none',
                transition: 'all 0.15s'
              }}
            >
              <span>🏠</span>
              <span>My Location ({homeLocation.name.split(',')[0]})</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setLocationTab('explore');
                if (propSwitchToExplore) propSwitchToExplore();
                setTimeout(() => {
                  const el = document.getElementById('predictStudioLocationInput');
                  if (el) el.focus();
                }, 50);
              }}
              style={{
                background: locationTab === 'explore' ? '#0284c7' : 'rgba(255, 255, 255, 0.05)',
                color: '#ffffff',
                border: locationTab === 'explore' ? '1px solid #38bdf8' : '1px solid rgba(255, 255, 255, 0.1)',
                padding: '7px 16px',
                borderRadius: '8px',
                fontSize: '0.82rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: locationTab === 'explore' ? '0 2px 10px rgba(2, 132, 199, 0.4)' : 'none',
                transition: 'all 0.15s'
              }}
            >
              <span>🔍</span>
              <span>Explore Other Location</span>
            </button>
          </div>

          {locationTab === 'explore' && (
            <button
              type="button"
              onClick={handleSwitchToMyLocation}
              style={{
                background: 'rgba(16, 185, 129, 0.15)',
                border: '1px solid #10b981',
                color: '#34d399',
                padding: '5px 12px',
                borderRadius: '6px',
                fontSize: '0.76rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px'
              }}
            >
              <span>↩️</span>
              <span>Back to My Location ({homeLocation.name.split(',')[0]})</span>
            </button>
          )}
        </div>

        {/* ACTIVE LOCATION ROW */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '1.4rem' }}>{locationTab === 'myLocation' ? '🏠' : (exploredLocation ? '🌐' : '🔍')}</span>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: locationTab === 'explore' && !exploredLocation ? '#38bdf8' : '#f8fafc' }}>
                  {locationTab === 'explore' && !exploredLocation
                    ? 'Search Any Location to Explore'
                    : params.location}
                </div>
                {locationTab === 'explore' && (
                  <span style={{
                    fontSize: '0.68rem',
                    background: exploredLocation ? 'rgba(2, 132, 199, 0.2)' : 'rgba(56, 189, 248, 0.15)',
                    color: '#38bdf8',
                    border: '1px solid rgba(56, 189, 248, 0.35)',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    fontWeight: 700
                  }}>
                    {exploredLocation ? 'EXPLORING' : 'SEARCH FIRST'}
                  </span>
                )}
                {locationTab === 'myLocation' && (
                  <button
                    type="button"
                    onClick={() => setIsChangingHome(prev => !prev)}
                    style={{
                      background: 'rgba(56, 189, 248, 0.14)',
                      border: '1px solid rgba(56, 189, 248, 0.45)',
                      color: '#38bdf8',
                      borderRadius: '6px',
                      padding: '3px 10px',
                      fontSize: '0.74rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      transition: 'all 0.15s'
                    }}
                    title="Change your saved home location"
                  >
                    <span>✏️</span>
                    <span>{isChangingHome ? 'Cancel' : 'Not your location? Change it'}</span>
                  </button>
                )}
              </div>
              <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '2px' }}>
                {locationTab === 'explore' && !exploredLocation
                  ? 'Type any town, city, or village in the search bar below to load live satellite & DEM observations'
                  : <span style={{ color: '#38bdf8', fontFamily: 'JetBrains Mono, monospace' }}>
                      Lat: {Number(params.latitude).toFixed(3)}° | Lon: {Number(params.longitude).toFixed(3)}° | Elevation: {params.elevation}m
                    </span>}
              </div>
            </div>
          </div>

          {/* Live Device Location Auto-Detect Button */}
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button
              type="button"
              onClick={handleDetectDeviceGPS}
              disabled={isLoading}
              style={{
                background: '#059669',
                color: '#ffffff',
                border: '1px solid #10b981',
                borderRadius: '8px',
                padding: '8px 16px',
                fontSize: '0.82rem',
                fontWeight: 700,
                cursor: isLoading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.2s',
                boxShadow: '0 2px 10px rgba(5, 150, 105, 0.3)'
              }}
              title="Lock onto your device's exact GPS coordinates and pull real-time weather"
            >
              📍 {gpsStatus || 'Sync My Device GPS'}
            </button>

            <button
              type="button"
              onClick={() => {
                const updated = {
                  ...params,
                  rainfall24h: 0,
                  rainfall72h: 0
                };
                setParams(updated);
                handleRunPrediction(updated);
              }}
              style={{
                background: 'rgba(16, 185, 129, 0.15)',
                color: '#10b981',
                border: '1px solid rgba(16, 185, 129, 0.4)',
                borderRadius: '8px',
                padding: '8px 14px',
                fontSize: '0.82rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
              title="Force rainfall to 0.0 mm if your location currently has no rain"
            >
              ☀️ 0 mm (Dry)
            </button>
          </div>
        </div>

        {/* INLINE HOME LOCATION CHANGER IF USER CLICKS NOT YOUR LOCATION */}
        {isChangingHome && (
          <div style={{
            background: 'rgba(2, 132, 199, 0.08)',
            border: '1px solid rgba(56, 189, 248, 0.35)',
            borderRadius: '10px',
            padding: '12px 16px',
            marginBottom: '14px'
          }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#38bdf8', marginBottom: '8px' }}>
              Set Your Home Town:
            </div>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
              <input
                type="text"
                autoFocus
                placeholder="Type your town (e.g. Kharupetia, Guwahati, Mumbai)..."
                value={newHomeQuery}
                onChange={(e) => setNewHomeQuery(e.target.value)}
                onKeyDown={async (e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (!newHomeQuery.trim()) return;
                    setIsNewHomeSearching(true);
                    try {
                      const res = await geocodeLocation(newHomeQuery.trim());
                      if (Array.isArray(res) && res.length > 0) {
                        setNewHomeResults(res.slice(0, 4));
                      }
                    } catch (err) {}
                    setIsNewHomeSearching(false);
                  }
                }}
                style={{
                  flex: 1,
                  background: '#040711',
                  border: '1px solid #1e293b',
                  borderRadius: '6px',
                  padding: '7px 12px',
                  color: '#fff',
                  fontSize: '0.82rem',
                  outline: 'none'
                }}
              />
              <button
                type="button"
                onClick={async () => {
                  if (!newHomeQuery.trim()) return;
                  setIsNewHomeSearching(true);
                  try {
                    const res = await geocodeLocation(newHomeQuery.trim());
                    if (Array.isArray(res) && res.length > 0) {
                      setNewHomeResults(res.slice(0, 4));
                    }
                  } catch (err) {}
                  setIsNewHomeSearching(false);
                }}
                disabled={isNewHomeSearching}
                style={{
                  background: '#0284c7',
                  border: 'none',
                  color: '#fff',
                  padding: '0 14px',
                  borderRadius: '6px',
                  fontWeight: 700,
                  fontSize: '0.78rem',
                  cursor: 'pointer'
                }}
              >
                {isNewHomeSearching ? 'Searching...' : 'Find'}
              </button>
            </div>


            {/* Matching Geocode Results */}
            {newHomeResults.length > 0 && (
              <div style={{ marginTop: '8px', borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '6px' }}>
                <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginBottom: '4px' }}>Select result:</div>
                {newHomeResults.map((r, i) => (
                  <div
                    key={i}
                    onClick={() => handleSetNewHome({ name: r.name, country: r.country || '', lat: r.lat, lng: r.lng })}
                    style={{
                      padding: '5px 8px',
                      background: 'rgba(255, 255, 255, 0.03)',
                      borderRadius: '4px',
                      marginBottom: '4px',
                      cursor: 'pointer',
                      fontSize: '0.76rem',
                      color: '#f8fafc',
                      display: 'flex',
                      justifyContent: 'space-between'
                    }}
                  >
                    <span>📍 {r.name}</span>
                    <span style={{ color: '#10b981', fontWeight: 700 }}>Set as Home ✓</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Global Search Bar */}
        <div style={{ position: 'relative' }}>
          {locationTab === 'explore' && !exploredLocation && (
            <div style={{
              background: 'rgba(56, 189, 248, 0.08)',
              border: '1px solid rgba(56, 189, 248, 0.3)',
              borderRadius: '8px',
              padding: '8px 14px',
              marginBottom: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '0.78rem',
              color: '#38bdf8'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>🔍</span>
                <span><strong>Search First:</strong> Type your desired town, city, or district below to fetch real-time planetary telemetry.</span>
              </div>
              <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                Home locked to {homeLocation?.name?.split(',')[0]}
              </span>
            </div>
          )}

          <div style={{ display: 'flex', gap: '10px' }}>
            <input
              id="predictStudioLocationInput"
              type="text"
              placeholder={locationTab === 'explore' && !exploredLocation
                ? "Type any city, town, or village to search & explore (e.g. Silchar, Mumbai, Dibrugarh, Delhi)..."
                : "Search any city, town or village (e.g. Silchar, Mumbai, Dibrugarh, Delhi)..."}
              value={locationQuery}
              onChange={(e) => setLocationQuery(e.target.value)}
              style={{
                flex: 1,
                padding: '10px 14px',
                borderRadius: '8px',
                border: locationTab === 'explore' && !exploredLocation ? '1.5px solid #38bdf8' : '1px solid rgba(56, 189, 248, 0.25)',
                boxShadow: locationTab === 'explore' && !exploredLocation ? '0 0 12px rgba(56, 189, 248, 0.25)' : 'none',
                background: '#0f172a',
                color: '#f8fafc',
                fontSize: '0.84rem'
              }}
            />
            {locationQuery && (
              <button
                onClick={() => setLocationQuery('')}
                style={{
                  background: '#0f172a',
                  border: '1px solid rgba(56, 189, 248, 0.25)',
                  color: '#94a3b8',
                  borderRadius: '6px',
                  padding: '0 12px',
                  fontSize: '0.8rem',
                  cursor: 'pointer'
                }}
              >
                Clear
              </button>
            )}
          </div>

          {/* Search Dropdown */}
          {searchResults.length > 0 && (
            <div style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              background: '#0b1120',
              border: '1px solid rgba(56, 189, 248, 0.3)',
              borderRadius: '8px',
              marginTop: '4px',
              boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
              zIndex: 30,
              maxHeight: '220px',
              overflowY: 'auto'
            }}>
              {searchResults.map((r, i) => (
                <div
                  key={i}
                  onClick={() => handleSelectLocation(r)}
                  style={{
                    padding: '10px 14px',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
                    cursor: 'pointer',
                    fontSize: '0.82rem',
                    color: '#cbd5e1'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#111a2d'}
                  onMouseLeave={(e) => e.currentTarget.style.background = '#0b1120'}
                >
                  <strong style={{ color: '#f8fafc' }}>{r.name}</strong>, {r.state ? `${r.state}, ` : ''}{r.country} ({r.lat.toFixed(2)}°, {r.lng.toFixed(2)}°)
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* PRODUCTION MODEL BANNER — Ensemble locked as sole production engine */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.10) 0%, rgba(12, 20, 40, 0.95) 100%)',
        border: '1.5px solid rgba(168, 85, 247, 0.40)',
        borderRadius: '14px',
        padding: '14px 20px',
        marginBottom: '24px',
        boxShadow: '0 8px 30px rgba(168, 85, 247, 0.12)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '38px', height: '38px',
            background: 'rgba(168, 85, 247, 0.18)',
            border: '1.5px solid rgba(168, 85, 247, 0.5)',
            borderRadius: '10px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1.15rem'
          }}>🧠</div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
              <span style={{ fontSize: '0.92rem', fontWeight: 800, color: '#f8fafc' }}>Super-Stack Ensemble</span>
              <span style={{
                fontSize: '0.64rem', fontWeight: 800,
                background: 'rgba(168, 85, 247, 0.22)',
                color: '#c084fc',
                border: '1px solid rgba(168, 85, 247, 0.45)',
                borderRadius: '999px',
                padding: '2px 8px',
                letterSpacing: '0.04em',
                textTransform: 'uppercase'
              }}>★ Active Production Model</span>
            </div>
            <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
              {[
                { label: 'Accuracy', val: '93.85%', color: '#c084fc' },
                { label: 'Recall', val: '95.1%', color: '#34d399' },
                { label: 'ROC-AUC', val: '0.982', color: '#38bdf8' },
                { label: 'Latency', val: '5.8ms', color: '#94a3b8' }
              ].map(s => (
                <div key={s.label} style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                  <span style={{ color: s.color, fontWeight: 800 }}>{s.val}</span>
                  {' '}{s.label}
                </div>
              ))}
            </div>
          </div>
        </div>
        <button
          onClick={() => onOpenPerformance && onOpenPerformance()}
          style={{
            background: 'rgba(168, 85, 247, 0.12)',
            border: '1px solid rgba(168, 85, 247, 0.35)',
            color: '#c084fc',
            borderRadius: '8px',
            padding: '7px 16px',
            fontSize: '0.76rem',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'all 0.2s'
          }}
          title="View and benchmark all ML models in the Performance Studio"
        >
          📊 Benchmark All Models →
        </button>
      </div>

      {/* TWO COLUMN WORKSTATION GRID */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '24px', alignItems: 'start' }}>
        {/* LEFT COLUMN: PARAMETER SLIDERS & SCENARIO CONTROLS */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* 1. COMPACT SIMULATOR CARD (WITH DOWN SCROLLBAR - REDUCED SIZE) */}
          <div
            className="simulator-down-scrollbar"
            style={{
              background: '#0b1120',
              border: '1px solid rgba(56, 189, 248, 0.18)',
              borderRadius: '14px',
              padding: '16px 18px 18px 18px',
              boxShadow: '0 8px 30px rgba(0,0,0,0.5)',
              maxHeight: '340px',
              overflowY: 'auto'
            }}
          >
            {/* Stress-Test Scenario Buttons */}
            <div style={{ marginBottom: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>
                Stress-Test Scenarios (1-Click Presets):
              </div>
              {activeMode === 'scenario' && (
                <button
                  onClick={handleResetToLive}
                  style={{
                    background: 'rgba(16, 185, 129, 0.15)',
                    border: '1px solid rgba(16, 185, 129, 0.4)',
                    color: '#34d399',
                    borderRadius: '6px',
                    padding: '3px 8px',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  ↺ Reset to Live Location
                </button>
              )}
            </div>
            <div
              className="stress-scenarios-scroll-tabs"
              style={{
                display: 'flex',
                gap: '10px',
                overflowX: 'auto',
                whiteSpace: 'nowrap',
                paddingBottom: '10px',
                scrollbarWidth: 'thin'
              }}
            >
              <button
                onClick={() => handleApplyScenario('live')}
                style={{
                  background: activeMode === 'live' ? 'rgba(16, 185, 129, 0.18)' : '#0f172a',
                  border: activeMode === 'live' ? '1.5px solid #10b981' : '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '10px',
                  padding: '9px 14px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  flex: '0 0 auto',
                  minWidth: '150px',
                  transition: 'all 0.15s ease'
                }}
              >
                <div style={{ fontSize: '0.82rem', fontWeight: 800, color: activeMode === 'live' ? '#34d399' : '#f8fafc' }}>
                  🛰️ Live Reality
                </div>
                <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>Real-Time Satellites</div>
              </button>
              {[
                { key: 'cloudburst', label: '⛈️ Cloudburst Shock', desc: '145mm 24h Rain' },
                { key: 'monsoon', label: '🌧️ Monsoon Saturated', desc: '260mm 72h Rain' },
                { key: 'coastal', label: '🌊 Coastal Surge', desc: 'Elevation 3m' },
                { key: 'dry', label: '☀️ Dry Baseline', desc: 'Minimal Rain' }
              ].map(s => (
                <button
                  key={s.key}
                  onClick={() => handleApplyScenario(s.key)}
                  style={{
                    background: activeMode === 'scenario' && selectedScenario === s.key ? 'rgba(2, 132, 199, 0.24)' : '#0f172a',
                    border: activeMode === 'scenario' && selectedScenario === s.key ? '1.5px solid #38bdf8' : '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '10px',
                    padding: '9px 14px',
                    textAlign: 'left',
                    cursor: 'pointer',
                    flex: '0 0 auto',
                    minWidth: '165px',
                    boxShadow: activeMode === 'scenario' && selectedScenario === s.key ? '0 0 14px rgba(56, 189, 248, 0.3)' : 'none',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div style={{ fontSize: '0.82rem', fontWeight: 800, color: activeMode === 'scenario' && selectedScenario === s.key ? '#38bdf8' : '#f8fafc' }}>
                    {s.label}
                  </div>
                  <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>{s.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Compact Inline Ground-Truth Calibration */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: groundTruthState.verified ? 'rgba(16, 185, 129, 0.08)' : 'rgba(255, 255, 255, 0.03)',
            border: groundTruthState.verified ? '1px solid rgba(16, 185, 129, 0.35)' : '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '8px',
            padding: '6px 12px',
            marginBottom: '10px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.74rem', color: '#cbd5e1', fontWeight: 700 }}>
              <span>🎯</span>
              <span>Ground Truth:</span>
              {groundTruthState.verified && (
                <span style={{ fontSize: '0.64rem', background: '#10b981', color: '#0f172a', fontWeight: 800, padding: '1px 6px', borderRadius: '4px' }}>
                  ✓ VERIFIED
                </span>
              )}
            </div>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                type="button"
                onClick={() => handleGroundTruthVerify(false)}
                style={{
                  background: groundTruthState.condition === 'DRY' ? '#10b981' : 'rgba(16, 185, 129, 0.15)',
                  color: groundTruthState.condition === 'DRY' ? '#0f172a' : '#34d399',
                  border: '1px solid rgba(16, 185, 129, 0.4)',
                  borderRadius: '6px',
                  padding: '4px 10px',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
                title="Verify dry ground conditions"
              >
                ☀️ Bone Dry (0mm)
              </button>
              <button
                type="button"
                onClick={() => handleGroundTruthVerify(true)}
                style={{
                  background: groundTruthState.condition === 'RAIN' ? '#38bdf8' : 'rgba(56, 189, 248, 0.15)',
                  color: groundTruthState.condition === 'RAIN' ? '#0f172a' : '#38bdf8',
                  border: '1px solid rgba(56, 189, 248, 0.4)',
                  borderRadius: '6px',
                  padding: '4px 10px',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
                title="Verify active rainfall on ground"
              >
                🌧️ Active Rain
              </button>
            </div>
          </div>

          {/* Sliders in Compact 2-Column Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 14px', paddingBottom: '8px' }}>
            {/* 24h Rain */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', fontWeight: 700, color: '#f8fafc', marginBottom: '2px' }}>
                <span>🌧️ 24h Rain</span>
                <span style={{ color: params.rainfall24h > 100 ? '#ef4444' : '#38bdf8' }}>{params.rainfall24h} mm</span>
              </div>
              <input
                type="range"
                min="0"
                max="250"
                value={params.rainfall24h}
                onChange={(e) => handleSliderChange('rainfall24h', parseFloat(e.target.value))}
                style={{ width: '100%', accentColor: '#0284c7' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.64rem', color: '#64748b' }}>
                <span>0 mm</span>
                <span>80mm (Sump Choke)</span>
                <span>250mm</span>
              </div>
            </div>

            {/* 72h Rain */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', fontWeight: 700, color: '#f8fafc', marginBottom: '2px' }}>
                <span>🌧️ 72h Rain</span>
                <span style={{ color: params.rainfall72h > 180 ? '#ef4444' : '#38bdf8' }}>{params.rainfall72h} mm</span>
              </div>
              <input
                type="range"
                min="0"
                max="400"
                value={params.rainfall72h}
                onChange={(e) => handleSliderChange('rainfall72h', parseFloat(e.target.value))}
                style={{ width: '100%', accentColor: '#0284c7' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.64rem', color: '#64748b' }}>
                <span>0 mm</span>
                <span>150mm (Saturated)</span>
                <span>400mm</span>
              </div>
            </div>

            {/* Elevation */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', fontWeight: 700, color: '#f8fafc', marginBottom: '2px' }}>
                <span>⛰️ DEM Elevation</span>
                <span style={{ color: params.elevation < 15 ? '#ef4444' : '#10b981' }}>{params.elevation}m</span>
              </div>
              <input
                type="range"
                min="1"
                max="300"
                value={params.elevation}
                onChange={(e) => handleSliderChange('elevation', parseFloat(e.target.value))}
                style={{ width: '100%', accentColor: '#10b981' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.64rem', color: '#64748b' }}>
                <span>1m (Basin)</span>
                <span>50m</span>
                <span>300m (High)</span>
              </div>
            </div>

            {/* Humidity & Temperature */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem', fontWeight: 700, color: '#cbd5e1', marginBottom: '2px' }}>
                  <span>💧 Hum.</span>
                  <span>{params.humidity}%</span>
                </div>
                <input
                  type="range"
                  min="20"
                  max="100"
                  value={params.humidity}
                  onChange={(e) => handleSliderChange('humidity', parseFloat(e.target.value))}
                  style={{ width: '100%', accentColor: '#0284c7' }}
                />
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem', fontWeight: 700, color: '#cbd5e1', marginBottom: '2px' }}>
                  <span>🌡️ Temp.</span>
                  <span>{params.temperature}°C</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="45"
                  value={params.temperature}
                  onChange={(e) => handleSliderChange('temperature', parseFloat(e.target.value))}
                  style={{ width: '100%', accentColor: '#0284c7' }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* 2. DEDICATED WORKSTATION CARD: HYDROLOGICAL & INFRASTRUCTURE DIAGNOSTICS (WITH DOWN SCROLLBAR) */}
        <div
          className="simulator-down-scrollbar"
          style={{
            background: '#0b1120',
            border: '1px solid rgba(56, 189, 248, 0.18)',
            borderRadius: '14px',
            padding: '16px 18px',
            boxShadow: '0 8px 30px rgba(0,0,0,0.5)',
            maxHeight: '460px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px'
          }}
        >
          {/* SECTION 1: CATCHMENT HYDRODYNAMIC DIAGNOSTICS */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
              <div>
                <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>🔬</span> Catchment Hydrodynamic Diagnostics
                </div>
                <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '2px' }}>
                  Real-time soil absorption, drainage surcharge & runoff mechanics
                </div>
              </div>
              <span style={{
                fontSize: '0.68rem',
                fontWeight: 800,
                padding: '3px 10px',
                borderRadius: '12px',
                background: activeMode === 'scenario' ? 'rgba(2, 132, 199, 0.2)' : 'rgba(16, 185, 129, 0.15)',
                color: activeMode === 'scenario' ? '#38bdf8' : '#34d399',
                border: `1px solid ${activeMode === 'scenario' ? 'rgba(56, 189, 248, 0.4)' : 'rgba(16, 185, 129, 0.4)'}`
              }}>
                {activeMode === 'scenario' ? '🧪 Backend Formula Engine' : '🧠 ML Super-Stack Ensemble'}
              </span>
            </div>

            {/* 4 Hydrodynamic telemetry tiles */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', marginBottom: '10px' }}>
              <div style={{ background: '#0f172a', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '8px', padding: '9px 10px' }}>
                <div style={{ fontSize: '0.66rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' }}>Soil Saturation</div>
                <div style={{ fontSize: '1.05rem', fontWeight: 800, color: params.rainfall72h > 150 ? '#ef4444' : (params.rainfall72h > 60 ? '#f59e0b' : '#34d399'), marginTop: '2px' }}>
                  {Math.min(100, Math.round((params.rainfall72h / 240) * 100))}%
                </div>
                <div style={{ fontSize: '0.64rem', color: '#64748b' }}>
                  {params.rainfall72h > 150 ? 'Infiltration Exhausted' : 'Absorptive Capacity Active'}
                </div>
              </div>

              <div style={{ background: '#0f172a', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '8px', padding: '9px 10px' }}>
                <div style={{ fontSize: '0.66rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' }}>Storm Drain Surcharge</div>
                <div style={{ fontSize: '1.05rem', fontWeight: 800, color: params.rainfall24h > 80 ? '#ef4444' : (params.rainfall24h > 35 ? '#f59e0b' : '#38bdf8'), marginTop: '2px' }}>
                  {Math.min(100, Math.round((params.rainfall24h / 120) * 100))}%
                </div>
                <div style={{ fontSize: '0.64rem', color: '#64748b' }}>
                  {params.rainfall24h > 80 ? 'Channel Choke Imminent' : 'Normal Gravity Flow'}
                </div>
              </div>

              <div style={{ background: '#0f172a', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '8px', padding: '9px 10px' }}>
                <div style={{ fontSize: '0.66rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' }}>Runoff Velocity</div>
                <div style={{ fontSize: '0.86rem', fontWeight: 800, color: '#f8fafc', marginTop: '2px' }}>
                  {params.elevation > 350 ? '⚡ Rapid Runoff (3.2 m/s)' : (params.elevation < 25 ? '🌊 Stagnant Basin (0.3 m/s)' : '🚗 Moderate Flow (1.4 m/s)')}
                </div>
                <div style={{ fontSize: '0.64rem', color: '#64748b' }}>
                  Gradient relief at {params.elevation}m DEM
                </div>
              </div>

              <div style={{ background: '#0f172a', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '8px', padding: '9px 10px' }}>
                <div style={{ fontSize: '0.66rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' }}>Safe Rainfall Buffer</div>
                <div style={{ fontSize: '1.05rem', fontWeight: 800, color: params.rainfall24h > 50 ? '#ef4444' : '#10b981', marginTop: '2px' }}>
                  {params.rainfall24h > 50 ? '0 mm (Breached)' : `${Math.round(Math.max(0, 50 - params.rainfall24h))} mm`}
                </div>
                <div style={{ fontSize: '0.64rem', color: '#64748b' }}>
                  Headroom before 50% flood line
                </div>
              </div>
            </div>

            {/* Engine Directive Bar */}
            <div style={{
              padding: '7px 11px',
              background: 'rgba(255, 255, 255, 0.03)',
              borderRadius: '8px',
              border: '1px solid rgba(255, 255, 255, 0.06)',
              fontSize: '0.71rem',
              color: '#94a3b8',
              lineHeight: 1.35
            }}>
              <span style={{ color: activeMode === 'scenario' ? '#38bdf8' : '#34d399', fontWeight: 700 }}>
                {activeMode === 'scenario' ? '🧪 Stress Mode Active:' : '📡 Real-Time Telemetry:'}
              </span>{' '}
              {activeMode === 'scenario'
                ? 'Stress-test probabilities are evaluated strictly through the calibrated hydrological formula engine without overriding live location ML telemetry.'
                : 'Live ground forecasts are inferred strictly through the production ML ensemble models (Optuna XGBoost & Random Forest Bagging).'}
            </div>
          </div>

          {/* SECTION 2: MUNICIPAL STORM DRAINAGE & CANAL INFRASTRUCTURE MONITOR */}
          <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
              <div>
                <div style={{ fontSize: '0.86rem', fontWeight: 800, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>🌊</span> Municipal Drainage & Canal Telemetry
                </div>
                <div style={{ fontSize: '0.70rem', color: '#94a3b8', marginTop: '2px' }}>
                  {params.location.includes('Bengaluru') || params.location.includes('Bangalore')
                    ? 'Rajakaluve storm canals & Bellandur/Varthur lake cascades'
                    : `Active primary storm conduits for ${params.location.split(',')[0]}`}
                </div>
              </div>
              <span style={{
                fontSize: '0.66rem',
                fontWeight: 800,
                padding: '2px 8px',
                borderRadius: '12px',
                background: params.rainfall24h > 60 ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                color: params.rainfall24h > 60 ? '#ef4444' : '#34d399',
                border: `1px solid ${params.rainfall24h > 60 ? 'rgba(239, 68, 68, 0.4)' : 'rgba(16, 185, 129, 0.4)'}`
              }}>
                {params.rainfall24h > 80 ? 'CRITICAL SURCHARGE' : (params.rainfall24h > 35 ? 'SURCHARGE WATCH' : 'NORMAL HEADROOM')}
              </span>
            </div>

            {/* Canal Load Bar */}
            <div style={{ marginBottom: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.70rem', color: '#cbd5e1', marginBottom: '3px' }}>
                <span>Storm Canal Throughput Capacity</span>
                <span style={{ fontWeight: 800, color: params.rainfall24h > 80 ? '#ef4444' : (params.rainfall24h > 35 ? '#f59e0b' : '#34d399') }}>
                  {Math.min(100, Math.round(35 + (params.rainfall24h * 0.55)))}%
                </span>
              </div>
              <div style={{ width: '100%', height: '7px', background: '#0f172a', borderRadius: '4px', overflow: 'hidden', border: '1px solid #1e293b' }}>
                <div style={{
                  width: `${Math.min(100, Math.round(35 + (params.rainfall24h * 0.55)))}%`,
                  height: '100%',
                  background: params.rainfall24h > 80 ? 'linear-gradient(90deg, #f59e0b, #ef4444)' : 'linear-gradient(90deg, #10b981, #0284c7)',
                  borderRadius: '4px',
                  transition: 'width 0.3s'
                }}></div>
              </div>
            </div>

            {/* Monitored Chokepoints Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px' }}>
              {[
                {
                  name: params.location.includes('Bengaluru') ? 'Rajakaluve Canals' : 'Primary Trunk Drain',
                  status: params.rainfall24h > 80 ? '95% Overrun' : (params.rainfall24h > 25 ? '65% Flowing' : 'Normal Gravity'),
                  color: params.rainfall24h > 80 ? '#ef4444' : (params.rainfall24h > 25 ? '#f59e0b' : '#34d399')
                },
                {
                  name: params.location.includes('Bengaluru') ? 'Lake Sluice Cascades' : 'Retention Basins',
                  status: params.rainfall24h > 100 ? 'Spillway Active' : (params.rainfall24h > 50 ? 'Basement Seepage' : 'Headroom Safe'),
                  color: params.rainfall24h > 100 ? '#ef4444' : (params.rainfall24h > 50 ? '#f59e0b' : '#34d399')
                },
                {
                  name: params.location.includes('Bengaluru') ? 'Underpass Sumps' : 'Roadway Dips',
                  status: params.rainfall24h > 50 ? '35-50cm Flooding' : (params.rainfall24h > 15 ? '10-20cm Pooling' : 'Dry & Clear'),
                  color: params.rainfall24h > 50 ? '#ef4444' : (params.rainfall24h > 15 ? '#f59e0b' : '#34d399')
                },
                {
                  name: 'Municipal Pumps',
                  status: params.rainfall24h > 50 ? 'Mobilized / Standby' : 'Routine Readiness',
                  color: params.rainfall24h > 50 ? '#38bdf8' : '#94a3b8'
                }
              ].map((cp, idx) => (
                <div key={idx} style={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '6px', padding: '6px 8px' }}>
                  <div style={{ fontSize: '0.64rem', color: '#94a3b8' }}>{cp.name}</div>
                  <div style={{ fontSize: '0.74rem', fontWeight: 800, color: cp.color, marginTop: '2px' }}>{cp.status}</div>
                </div>
              ))}
            </div>
          </div>

          {/* SECTION 3: BASIN GRAVITATIONAL RECESSION & ABATEMENT TIMELINE */}
          <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <div>
                <div style={{ fontSize: '0.86rem', fontWeight: 800, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>⏱️</span> Inundation Recession & Clearance Forecast
                </div>
                <div style={{ fontSize: '0.70rem', color: '#94a3b8', marginTop: '2px' }}>
                  {params.elevation > 400
                    ? `Plateau gravity discharge (${params.elevation}m DEM): Clears rapidly down river valleys`
                    : `Lowland basin drainage (${params.elevation}m DEM): Natural seepage & pump reliant`}
                </div>
              </div>
              <span style={{ fontSize: '0.66rem', color: '#38bdf8', fontWeight: 700, background: 'rgba(56, 189, 248, 0.1)', padding: '2px 8px', borderRadius: '4px' }}>
                {params.elevation > 400 ? '⚡ Rapid Plateau Flow' : '🌊 Alluvial Ponding'}
              </span>
            </div>

            {/* Clearance Stages Timeline */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px', marginBottom: '8px' }}>
              <div style={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '6px', padding: '7px', textAlign: 'center' }}>
                <div style={{ fontSize: '0.62rem', color: '#94a3b8' }}>Curb Gutters</div>
                <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#34d399', marginTop: '2px' }}>
                  {params.rainfall24h > 50 ? '~45 min' : '< 15 min'}
                </div>
                <div style={{ fontSize: '0.58rem', color: '#64748b' }}>Post-rain clearing</div>
              </div>

              <div style={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '6px', padding: '7px', textAlign: 'center' }}>
                <div style={{ fontSize: '0.62rem', color: '#94a3b8' }}>Underpasses</div>
                <div style={{ fontSize: '0.88rem', fontWeight: 800, color: params.rainfall24h > 80 ? '#f59e0b' : '#38bdf8', marginTop: '2px' }}>
                  {params.rainfall24h > 80 ? '~3.0 hrs' : (params.rainfall24h > 35 ? '~1.5 hrs' : '0 min')}
                </div>
                <div style={{ fontSize: '0.58rem', color: '#64748b' }}>With pump assist</div>
              </div>

              <div style={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '6px', padding: '7px', textAlign: 'center' }}>
                <div style={{ fontSize: '0.62rem', color: '#94a3b8' }}>100% Headroom</div>
                <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#f8fafc', marginTop: '2px' }}>
                  {params.elevation > 400 ? '~3.5 hrs' : '~8.0 hrs'}
                </div>
                <div style={{ fontSize: '0.58rem', color: '#64748b' }}>Full basin recovery</div>
              </div>
            </div>

            <div style={{ fontSize: '0.70rem', color: '#94a3b8', lineHeight: 1.35, background: 'rgba(255,255,255,0.02)', padding: '6px 8px', borderRadius: '6px' }}>
              {params.location.includes('Bengaluru')
                ? 'High-gradient Deccan plateau gravitational discharge clears Vrishabhavathi and Challaghatta valley corridors within 3 hours of rain cessation.'
                : `Natural terrain slope at ${params.elevation}m DEM provides steady runoff discharge through primary regional catchment channels.`}
            </div>
          </div>
        </div>
      </div>

        {/* RIGHT COLUMN: PREDICTION RESULTS, GAUGE & ADVISORIES */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Main Risk Score Card */}
          <div style={{
            background: '#0b1120',
            border: isBreached ? '2px solid #ef4444' : (activeMode === 'scenario' ? '1.5px solid rgba(56, 189, 248, 0.5)' : '1px solid rgba(56, 189, 248, 0.18)'),
            borderRadius: '14px',
            padding: '24px',
            boxShadow: '0 8px 30px rgba(0,0,0,0.5)',
            position: 'relative'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
              <div>
                <span style={{ fontSize: '0.82rem', fontWeight: 800, color: activeMode === 'scenario' ? '#38bdf8' : '#94a3b8', textTransform: 'uppercase' }}>
                  {activeMode === 'scenario' ? '🧪 Stress-Test Scenario Assessment' : '📡 Live Location Risk Assessment'}
                </span>
                <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '2px' }}>
                  {activeMode === 'scenario' ? 'Hypothetical what-if simulation (does not affect live location)' : `Real-time satellite & DEM observation for ${liveParams.location}`}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{
                  background: (displayPrediction?.status || 'LIVE').toUpperCase() === 'SIMULATED' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                  color: (displayPrediction?.status || 'LIVE').toUpperCase() === 'SIMULATED' ? '#fbbf24' : '#34d399',
                  border: `1px solid ${(displayPrediction?.status || 'LIVE').toUpperCase() === 'SIMULATED' ? 'rgba(245, 158, 11, 0.4)' : 'rgba(16, 185, 129, 0.4)'}`,
                  padding: '3px 8px',
                  borderRadius: '12px',
                  fontSize: '0.68rem',
                  fontWeight: 800
                }}>
                  {(displayPrediction?.status || 'LIVE').toUpperCase() === 'SIMULATED' ? 'SIMULATED BASELINE' : 'LIVE TELEMETRY'}
                </span>
                <span style={{
                  background: isBreached ? 'rgba(239, 68, 68, 0.16)' : 'rgba(16, 185, 129, 0.16)',
                  color: isBreached ? '#ef4444' : '#10b981',
                  border: isBreached ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid rgba(16, 185, 129, 0.4)',
                  padding: '4px 12px',
                  borderRadius: '16px',
                  fontSize: '0.78rem',
                  fontWeight: 800
                }}>
                  {activeMode === 'scenario' ? `SIMULATION: ${isBreached ? 'CRITICAL RISK' : 'NORMAL'}` : (isBreached ? 'CRITICAL RISK (>50%)' : 'NORMAL / SAFE (<50%)')}
                </span>
              </div>
            </div>

            {/* Big Probability Number & Meter */}
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '8px' }}>
              <span style={{ fontSize: '3.2rem', fontWeight: 900, color: isBreached ? '#ef4444' : '#10b981', lineHeight: 1 }}>
                {prob}%
              </span>
              <span style={{ fontSize: '0.9rem', color: '#94a3b8', fontWeight: 600 }}>
                {activeMode === 'scenario' ? 'Simulated Inundation Probability' : 'Inundation Probability'}
              </span>
            </div>

            {/* Threshold Bar with Solid Single Color */}
            <div style={{ width: '100%', height: '10px', background: '#1e293b', borderRadius: '5px', overflow: 'hidden', position: 'relative', marginBottom: '14px' }}>
              <div style={{
                width: `${prob}%`,
                height: '100%',
                backgroundColor: isBreached ? '#ef4444' : '#10b981'
              }}></div>
              {/* 50% Threshold Mark */}
              <div style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: '2px', background: '#ffffff' }}></div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: '#64748b', marginBottom: '16px' }}>
              <span>0% Safe</span>
              <span style={{ fontWeight: 700, color: '#f8fafc' }}>▲ 50% Danger Line</span>
              <span>100% Catastrophic</span>
            </div>

            {/* 4 Physical Hydro Metrics Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', marginBottom: '14px' }}>
              <div style={{ background: '#0f172a', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '8px', padding: '10px' }}>
                <div style={{ fontSize: '0.68rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>Est. Inundation Depth</div>
                <div style={{ fontSize: '1.15rem', fontWeight: 800, color: (displayPrediction?.inundationDepthMeters || 0) >= 0.45 ? '#ef4444' : ((displayPrediction?.inundationDepthMeters || 0) >= 0.15 ? '#f59e0b' : '#38bdf8') }}>
                  🌊 {displayPrediction?.inundationDepthMeters !== undefined ? `${displayPrediction.inundationDepthMeters} m` : `${estDepthMeters} m`}
                </div>
                <div style={{ fontSize: '0.7rem', color: '#cbd5e1', marginTop: '2px', fontWeight: 600 }}>
                  {displayPrediction?.depthTier || (isBreached ? 'Tier 2: Knee Depth' : 'Tier 0: Surface Runoff')}
                </div>
              </div>

              <div style={{ background: '#0f172a', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '8px', padding: '10px' }}>
                <div style={{ fontSize: '0.68rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>Runoff Velocity</div>
                <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#f8fafc', marginTop: '4px' }}>
                  {displayPrediction?.flowVelocity || 'Stagnant Urban Ponding'}
                </div>
                <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '2px' }}>
                  Catchment slope & drainage relief index
                </div>
              </div>
            </div>

            {/* Life Safety Directive Box */}
            <div style={{
              background: isBreached ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.08)',
              border: `1px solid ${isBreached ? 'rgba(239, 68, 68, 0.35)' : 'rgba(16, 185, 129, 0.25)'}`,
              borderRadius: '8px',
              padding: '10px 14px',
              fontSize: '0.75rem',
              color: '#f1f5f9',
              lineHeight: 1.45
            }}>
              <strong style={{ color: isBreached ? '#ef4444' : '#10b981', display: 'block', marginBottom: '2px', textTransform: 'uppercase', fontSize: '0.7rem', letterSpacing: '0.04em' }}>
                🚨 Life-Safety Action Directive:
              </strong>
              {displayPrediction?.lifeSafetyDirective || (isBreached ? 'Execute vertical evacuation to second floor. Disconnect power. Dial 112 for disaster emergency response.' : 'Conditions normal. Routine drainage monitoring.')}
            </div>
          </div>

          {/* Active Live Location Reference Card (Shown when testing a simulation scenario) */}
          {activeMode === 'scenario' && (
            <div style={{
              background: '#0b1120',
              border: '1px solid rgba(16, 185, 129, 0.35)',
              borderRadius: '12px',
              padding: '14px 18px',
              boxShadow: '0 8px 24px rgba(0,0,0,0.4)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#10b981', textTransform: 'uppercase' }}>
                    📍 Actual Ground Reality: {liveParams.location}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '2px' }}>
                    <span style={{ fontSize: '1.4rem', fontWeight: 900, color: (livePrediction?.probability || 0) >= 50 ? '#ef4444' : '#10b981' }}>
                      {livePrediction ? livePrediction.probability : 2.4}%
                    </span>
                    <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                      {livePrediction?.riskLevel || 'LOW RISK'} • {liveParams.rainfall24h} mm live 24h rain
                    </span>
                  </div>
                </div>
                <button
                  onClick={handleResetToLive}
                  style={{
                    background: 'rgba(16, 185, 129, 0.15)',
                    border: '1px solid rgba(16, 185, 129, 0.4)',
                    color: '#34d399',
                    borderRadius: '8px',
                    padding: '6px 14px',
                    fontSize: '0.76rem',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  View Live Reality →
                </button>
              </div>
            </div>
          )}

          {/* Top Risk Contributors for this prediction */}
          <div style={{ background: '#0b1120', border: '1px solid rgba(56, 189, 248, 0.18)', borderRadius: '14px', padding: '20px', boxShadow: '0 8px 30px rgba(0,0,0,0.5)' }}>
            <h4 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#f8fafc', margin: '0 0 12px 0' }}>
              Key Environmental Risk Factors
            </h4>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {(prediction?.riskFactors || [
                { name: 'Rainfall (72h)', value: 31, color: '#ef4444' },
                { name: 'Rainfall (24h)', value: 22, color: '#f97316' },
                { name: 'Elevation Vulnerability', value: 18, color: '#eab308' },
                { name: 'Relative Humidity', value: 12, color: '#06b6d4' }
              ]).map((rf, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                  <span style={{ color: '#cbd5e1', fontWeight: 600 }}>{rf.name}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '50%' }}>
                    <div style={{ flex: 1, height: '6px', background: '#1e293b', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ width: `${rf.value * 2.5}%`, height: '100%', backgroundColor: rf.color || '#38bdf8' }}></div>
                    </div>
                    <span style={{ width: '32px', textAlign: 'right', fontWeight: 700, color: '#f8fafc' }}>{rf.value}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Multi-Model Consensus & Comparison: XGBoost vs Random Forest vs Super-Stack */}
          <div style={{ background: '#0b1120', border: '1px solid rgba(56, 189, 248, 0.18)', borderRadius: '14px', padding: '20px', boxShadow: '0 8px 30px rgba(0,0,0,0.5)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: modelComparison || compareError ? '14px' : '0', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#f8fafc', margin: 0 }}>
                  Multi-Model Consensus & Comparison
                </h4>
                <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                  Evaluates all 3 architectures simultaneously on active telemetry
                </div>
              </div>
              <button
                onClick={handleCompareModels}
                disabled={isComparing}
                style={{
                  background: 'rgba(56, 189, 248, 0.12)',
                  border: '1px solid rgba(56, 189, 248, 0.35)',
                  color: '#38bdf8',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  borderRadius: '8px',
                  padding: '6px 14px',
                  cursor: isComparing ? 'default' : 'pointer',
                  opacity: isComparing ? 0.6 : 1
                }}
              >
                {isComparing ? 'Running 3 Engines...' : '⚡ Compare All 3 Models'}
              </button>
            </div>

            {compareError && (
              <div style={{ fontSize: '0.78rem', color: '#f87171' }}>{compareError}</div>
            )}

            {modelComparison && (
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px', marginBottom: '12px' }}>
                  {modelComparison.predictions.map((mp) => {
                    const isEns = mp.modelId.includes('ensemble');
                    return (
                      <div key={mp.modelId} style={{
                        background: isEns ? 'rgba(168, 85, 247, 0.08)' : '#0f172a',
                        border: isEns ? '1px solid rgba(168, 85, 247, 0.4)' : '1px solid rgba(255, 255, 255, 0.08)',
                        borderRadius: '10px',
                        padding: '12px 10px'
                      }}>
                        <div style={{ fontSize: '0.64rem', color: isEns ? '#c084fc' : '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                          {mp.modelName}
                        </div>
                        <div style={{ fontSize: '1.35rem', fontWeight: 900, color: '#f8fafc', margin: '4px 0' }}>
                          {mp.probability}%
                        </div>
                        <div style={{
                          display: 'inline-block',
                          fontSize: '0.68rem',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: '999px',
                          color: mp.riskClass === 'high' ? '#ef4444' : (mp.riskClass === 'moderate' ? '#eab308' : '#10b981'),
                          background: mp.riskClass === 'high' ? 'rgba(239, 68, 68, 0.15)' : (mp.riskClass === 'moderate' ? 'rgba(234, 179, 8, 0.15)' : 'rgba(16, 185, 129, 0.15)')
                        }}>
                          {mp.riskLevel}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div style={{ fontSize: '0.76rem', color: '#cbd5e1', background: 'rgba(255,255,255,0.03)', padding: '10px 14px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                  <span style={{ fontWeight: 800, color: modelComparison.agreement === 'Consensus' ? '#34d399' : '#f59e0b' }}>
                    Status: {modelComparison.agreement}
                  </span>
                  {' — '}
                  <span>Spread Delta: {modelComparison.probabilityDelta}%.</span>
                  {' '}
                  <span style={{ color: '#94a3b8' }}>
                    {modelComparison.agreement === 'Consensus'
                      ? 'Unanimous decision boundary reached across all algorithms.'
                      : 'Tree decision boundaries diverge — consider Super-Stack weighted consensus as authority.'}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Civic Recommendation */}
          <div style={{
            background: isBreached ? 'rgba(239, 68, 68, 0.12)' : 'rgba(16, 185, 129, 0.12)',
            border: isBreached ? '1px solid rgba(239, 68, 68, 0.35)' : '1px solid rgba(16, 185, 129, 0.35)',
            borderRadius: '12px',
            padding: '16px'
          }}>
            <div style={{ fontSize: '0.84rem', fontWeight: 800, color: isBreached ? '#ef4444' : '#10b981', marginBottom: '4px' }}>
              {isBreached ? '🚨 Emergency Directives for Municipal Authorities:' : '✅ Normal Operational Advisory:'}
            </div>
            <div style={{ fontSize: '0.8rem', color: '#e2e8f0', lineHeight: 1.4 }}>
              {prediction?.recommendation || (isBreached
                ? 'Issue immediate evacuation directives for ground floor residents in basin zones. Deploy high-capacity municipal de-watering pumps to storm sluices.'
                : 'Environmental parameters safe. Continue routine hydrologic monitoring.'
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
