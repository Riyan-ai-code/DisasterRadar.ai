import React, { useState, useEffect, useCallback } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import TopMetrics from './components/TopMetrics';
import InputParameters from './components/InputParameters';
import RiskFactors from './components/RiskFactors';
import RiskMap from './components/RiskMap';
import ModelPerformance from './components/ModelPerformance';
import RecentPredictions from './components/RecentPredictions';
import InfoBanner from './components/InfoBanner';
import Modal from './components/Modal';
import GlobeRiskMap from './components/GlobeRiskMap';
import HistoricalDataView from './components/HistoricalDataView';
import AlertsReportsView from './components/AlertsReportsView';
import AboutProjectView from './components/AboutProjectView';
import ModelPerformanceView from './components/ModelPerformanceView';
import PredictRiskView from './components/PredictRiskView';
import AiExplainerView from './components/AiExplainerView';
import SplineAiGuardian from './components/SplineAiGuardian';
import EvacuationRouteView from './components/EvacuationRouteView';
import CycloneMonitorView from './components/CycloneMonitorView';
import InstallAppModal from './components/InstallAppModal';
import LocationTransparencyBanner from './components/LocationTransparencyBanner';

import {
  predictFloodRisk,
  fetchStations,
  fetchModelPerformance,
  fetchRecentPredictions,
  fetchLiveWeatherByLocationOrCoords,
  reverseGeocodeCoords,
  fetchIpLocation
} from './services/api';

export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedCycloneIdForView, setSelectedCycloneIdForView] = useState(null);
  const [modalState, setModalState] = useState({ isOpen: false, type: null });
  const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false);

  // 1. Permanent User Home Location: Strictly locked to Kharupetia, Assam
  const DEFAULT_HOME_LOCATION = {
    name: 'Kharupetia, Assam',
    country: 'India',
    lat: 26.5181,
    lng: 92.1384,
    elevation: 48
  };

  const [homeLocation, setHomeLocation] = useState(() => {
    try {
      const saved = localStorage.getItem('disasterradar_home_location');
      if (saved) {
        const parsed = JSON.parse(saved);
        // If explicitly saved by user through "Change it", always honor it permanently!
        if (parsed?.isUserExplicitHome && parsed?.lat) {
          return parsed;
        }
        const n = (parsed?.name || '').toLowerCase();
        // If legacy corrupted entry without explicit confirmation, ignore
        if (
          parsed?.lat &&
          !n.includes('guwahati') &&
          !n.includes('boka') &&
          !n.includes('boko') &&
          !n.includes('bengaluru')
        ) {
          return parsed;
        }
      }
    } catch (e) {}
    return DEFAULT_HOME_LOCATION;
  });

  // 2. Explored Location (for inspecting other cities/towns without changing home)
  const [exploredLocation, setExploredLocation] = useState({
    name: 'Guwahati, Assam',
    country: 'India',
    lat: 26.1445,
    lng: 91.7362,
    elevation: 55
  });

  // 3. Location Mode Tab: 'myLocation' | 'explore'
  const [locationTab, setLocationTab] = useState('myLocation');

  // Active Geographic Zone for Risk Map and Telemetry
  const activeLocation = locationTab === 'myLocation' ? homeLocation : exploredLocation;

  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);

  // Input Parameters State (Initialized to real live baseline for Kharupetia, Assam)
  const [params, setParams] = useState({
    rainfall24h: 0.0,
    rainfall72h: 0.0,
    temperature: 24.5,
    humidity: 75,
    windSpeed: 10,
    pressure: 1010,
    elevation: 48,
    latitude: 26.5181,
    longitude: 92.1384,
    location: 'Kharupetia, Assam'
  });

  // Current Prediction State (computed dynamically from ML model)
  const [prediction, setPrediction] = useState({
    probability: 0.0,
    riskLevel: 'LOW',
    riskClass: 'low',
    recommendation: 'SAFE: Environmental conditions well within absorption thresholds. Continue routine hydrological monitoring.',
    location: 'Kharupetia, Assam',
    latitude: 26.5181,
    longitude: 92.1384,
    riskFactors: [
      { name: 'Humidity', value: 12, color: '#eab308' },
      { name: 'Rainfall (72h)', value: 5, color: '#ef4444' },
      { name: 'Rainfall (24h)', value: 4, color: '#f97316' },
      { name: 'Elevation', value: 3, color: '#a3e635' },
      { name: 'Temperature', value: 2, color: '#84cc16' }
    ]
  });

  // Dashboard Telemetry and Model Data
  const [stations, setStations] = useState([]);
  const [modelMetrics, setModelMetrics] = useState(null);
  const [recentPredictions, setRecentPredictions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingRealTelemetry, setIsFetchingRealTelemetry] = useState(false);
  const [telemetrySyncStatus, setTelemetrySyncStatus] = useState('');

  // Unified Location & Live Telemetry Synchronizer for ALL tabs
  // CRITICAL: NEVER overwrite homeLocation here! homeLocation is only updated via handleUpdateHomeLocation
  const handleLocationTelemetrySync = useCallback(async (newLoc, newParams = null, newPred = null, isExploreMode = null) => {
    if (!newLoc) return;

    // Check if newLoc matches the user's permanent home coordinates
    const isActuallyHome = Math.abs(Number(newLoc.lat) - Number(homeLocation.lat)) < 0.005 &&
                           Math.abs(Number(newLoc.lng) - Number(homeLocation.lng)) < 0.005;

    // Any location that is not home is treated as EXPLORE mode
    const isExploring = isExploreMode === true ? true : (isExploreMode === false ? false : !isActuallyHome);

    if (isExploring) {
      setLocationTab('explore');
      setExploredLocation(newLoc);
    } else {
      setLocationTab('myLocation');
      // Keep home location safe and untouched
    }

    if (newParams && newPred) {
      setParams(newParams);
      setPrediction(newPred);
      setIsFetchingRealTelemetry(false);
      return;
    }

    // Keep actively fetching real data for the requested location until loaded
    setIsFetchingRealTelemetry(true);
    setTelemetrySyncStatus(`Fetching real-time Open-Meteo & Copernicus telemetry for ${newLoc.name}...`);
    try {
      const live = await fetchLiveWeatherByLocationOrCoords({
        latitude: newLoc.lat,
        longitude: newLoc.lng,
        location: newLoc.name
      });
      if (live) {
        const updated = {
          rainfall24h: live.rainfall24h,
          rainfall72h: live.rainfall72h,
          currentRainfall: live.currentRainfall,
          isRaining: live.isRaining,
          temperature: live.temperature,
          humidity: live.humidity,
          windSpeed: live.windSpeed || 12,
          pressure: live.pressure || 1012,
          elevation: live.elevation,
          latitude: newLoc.lat,
          longitude: newLoc.lng,
          location: newLoc.name
        };
        setParams(updated);
        const pred = await predictFloodRisk(updated);
        if (pred) setPrediction(pred);
        setTelemetrySyncStatus(`✓ Live telemetry loaded for ${newLoc.name}`);
        setTimeout(() => setTelemetrySyncStatus(''), 4000);
      }
    } catch (err) {
      console.warn('Real-time sync error for location:', err);
      setTelemetrySyncStatus('⚠️ Sync error, retrying...');
    } finally {
      setIsFetchingRealTelemetry(false);
    }
  }, [homeLocation.lat, homeLocation.lng]);

  // Tab 1: Switch back to User's Home Location (Kharupetia, Assam)
  const handleSwitchToMyLocation = async () => {
    setLocationTab('myLocation');
    await handleLocationTelemetrySync(homeLocation, null, null, false);
  };

  // Tab 2: Switch to Exploring another city/town (preserves home location safely)
  const handleSwitchToExplore = async (locToExplore = null) => {
    setLocationTab('explore');
    const target = locToExplore || exploredLocation;
    await handleLocationTelemetrySync(target, null, null, true);
  };

  // Update User's Home Location permanently (ONLY via explicit "Not your location? Change it" / Set as Home)
  const handleUpdateHomeLocation = async (newHome) => {
    if (!newHome || !newHome.lat) return;
    const homeObj = {
      ...newHome,
      isUserExplicitHome: true
    };
    setHomeLocation(homeObj);
    try {
      localStorage.setItem('disasterradar_home_location', JSON.stringify(homeObj));
      localStorage.setItem('disasterradar_user_location', JSON.stringify(homeObj));
    } catch (e) {}
    setLocationTab('myLocation');
    await handleLocationTelemetrySync(homeObj, null, null, false);
  };

  // Initial Data Fetch
  useEffect(() => {
    async function loadData() {
      // Purge any accidental legacy unconfirmed artifacts from localStorage
      try {
        const savedLoc = localStorage.getItem('disasterradar_home_location');
        if (savedLoc) {
          const parsed = JSON.parse(savedLoc);
          if (!parsed?.isUserExplicitHome) {
            const n = (parsed?.name || '').toLowerCase();
            if (n.includes('guwahati') || n.includes('boka') || n.includes('boko') || n.includes('bengaluru')) {
              localStorage.removeItem('disasterradar_home_location');
              localStorage.removeItem('disasterradar_user_location');
            }
          }
        }
      } catch (e) {}

      const [stationList, perfData, recentData] = await Promise.all([
        fetchStations(),
        fetchModelPerformance(),
        fetchRecentPredictions()
      ]);
      setStations(Array.isArray(stationList) ? stationList : []);
      setModelMetrics(perfData);
      setRecentPredictions(recentData);

      // Fetch live real telemetry directly for home location (Kharupetia, Assam) with zero static fallbacks
      await handleLocationTelemetrySync(homeLocation, null, null, false);
    }
    loadData();
  }, []);

  // Handle Input Changes
  const handleParamChange = (field, value) => {
    setParams(prev => ({
      ...prev,
      [field]: value
    }));
    // Note: Do not mutate homeLocation here; manual parameter changes belong strictly to simulation
  };

  // Handle Prediction Action (calls FastAPI POST /api/predict)
  const handlePredict = async () => {
    setIsLoading(true);
    try {
      const result = await predictFloodRisk(params);
      setPrediction(result);

      // Prepend to recent list with clean location name
      const now = new Date();
      const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
      let locLabel = params.location || 'Active Station';
      if (locLabel.startsWith('Device Location (')) {
        locLabel = `Device (${params.latitude ? Number(params.latitude).toFixed(2) : '12.96'}°N, ${params.longitude ? Number(params.longitude).toFixed(2) : '77.71'}°E)`;
      } else {
        locLabel = locLabel.split(',')[0];
      }

      const newRecent = {
        time: timeStr,
        location: locLabel,
        probability: result.probability,
        riskLevel: result.riskLevel
      };
      setRecentPredictions(prev => {
        const filtered = prev.filter(p => !(p.location === newRecent.location && Math.abs(p.probability - newRecent.probability) < 0.05 && p.time === newRecent.time));
        return [newRecent, ...filtered.slice(0, 5)];
      });
    } catch (err) {
      console.error('Prediction failed:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Station selection from Map
  const handleSelectStation = (station) => {
    setLocationTab('explore');
    setExploredLocation({
      name: station.name,
      country: 'Karnataka, India',
      lat: station.lat,
      lng: station.lng,
      elevation: station.elev
    });

    const updatedParams = {
      rainfall24h: station.r24,
      rainfall72h: station.r72,
      temperature: station.temp,
      humidity: station.hum,
      windSpeed: 12,
      pressure: 1005,
      elevation: station.elev,
      latitude: station.lat,
      longitude: station.lng,
      location: `${station.name}, Karnataka`
    };
    setParams(updatedParams);

    // Run prediction for that station
    predictFloodRisk(updatedParams).then(res => {
      setPrediction(res);
    });
  };

  // Tab Navigation Handling
  const handleSelectTab = (tabId) => {
    setActiveTab(tabId);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };


  const handleGlobePredict = (locData) => {
    setLocationTab('explore');
    setExploredLocation({
      name: locData.name,
      country: locData.country || '',
      lat: locData.lat,
      lng: locData.lng,
      elevation: locData.elev ?? locData.elevation ?? 15
    });

    const updatedParams = {
      rainfall24h: locData.r24 ?? locData.rainfall24h ?? 0.0,
      rainfall72h: locData.r72 ?? locData.rainfall72h ?? 0.0,
      currentRainfall: locData.currentRainfall ?? locData.current_rainfall ?? 0.0,
      isRaining: Boolean(locData.isRaining ?? locData.is_raining),
      temperature: locData.temp ?? locData.temperature ?? 25,
      humidity: locData.hum ?? locData.humidity ?? 60,
      windSpeed: locData.wind ?? locData.windSpeed ?? 10,
      pressure: locData.pressure ?? 1013,
      elevation: locData.elev ?? locData.elevation ?? 15,
      latitude: locData.lat,
      longitude: locData.lng,
      location: locData.country ? `${locData.name}, ${locData.country}` : locData.name
    };
    setParams(updatedParams);
    setActiveTab('dashboard');
    setIsLoading(true);
    predictFloodRisk(updatedParams).then(res => {
      setPrediction(res);
      setIsLoading(false);
      setTimeout(() => {
        document.getElementById('inputParamsCard')?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    });
  };


  return (
    <div className="app-container">
      {/* LEFT SIDEBAR */}
      <Sidebar
        isOpen={sidebarOpen}
        activeTab={activeTab}
        onSelectTab={handleSelectTab}
        onOpenModal={(type) => setModalState({ isOpen: true, type })}
        onDownloadApp={() => setIsDownloadModalOpen(true)}
      />

      {/* MAIN WRAPPER */}
      <main className="main-wrapper">
        <Header
          onToggleSidebar={() => setSidebarOpen(prev => !prev)}
          onOpenAlerts={() => setActiveTab('alerts')}
          onOpenProfile={() => setActiveTab('about')}
          onDownloadApp={() => setIsDownloadModalOpen(true)}
          activeLocation={activeLocation}
          homeLocation={homeLocation}
          locationTab={locationTab}
          onSwitchToMyLocation={handleSwitchToMyLocation}
          onSwitchToExplore={handleSwitchToExplore}
          isFetchingRealTelemetry={isFetchingRealTelemetry}
          onLocationChange={handleLocationTelemetrySync}
        />

        {/* Real-time Telemetry Ingestion Banner */}
        {isFetchingRealTelemetry && (
          <div style={{
            background: 'rgba(2, 132, 199, 0.16)',
            borderBottom: '1px solid rgba(56, 189, 248, 0.35)',
            padding: '8px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.82rem',
            color: '#38bdf8',
            fontWeight: 600,
            zIndex: 40
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="live-pulsing-dot" style={{ background: '#38bdf8', width: '8px', height: '8px' }} />
              <span>{telemetrySyncStatus || `Ingesting real-time Open-Meteo & Copernicus telemetry for ${activeLocation.name}...`}</span>
            </div>
            <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Live Planetary Stream</span>
          </div>
        )}

        {activeTab === 'cyclone' ? (
          /* TROPICAL CYCLONE MONITOR & NIO FORECAST CONE VIEW */
          <CycloneMonitorView
            initialCycloneId={selectedCycloneIdForView}
            onBackToDashboard={() => setActiveTab('dashboard')}
            onSelectLocationForFloodPredict={handleGlobePredict}
          />
        ) : activeTab === 'map' ? (
          /* 3D WORLD GLOBE & CARTOGRAPHIC GIS ATLAS VIEW */
          <GlobeRiskMap
            onBackToDashboard={() => setActiveTab('dashboard')}
            onSelectLocationForPredict={handleGlobePredict}
            activeLocation={activeLocation}
            currentParams={params}
            currentPrediction={prediction}
            onLocationChange={handleLocationTelemetrySync}
            onOpenHistoryModal={() => setActiveTab('historical')}
          />
        ) : activeTab === 'evacuation' ? (
          /* SATELLITE ROAD BLOCKAGE & OFFLINE EVACUATION NAVIGATOR */
          <EvacuationRouteView
            onBackToDashboard={() => setActiveTab('dashboard')}
            activeLocation={activeLocation}
            onDownloadApp={() => setIsDownloadModalOpen(true)}
          />
        ) : activeTab === 'predict' ? (
          /* FULL-PAGE PRODUCTION PREDICT RISK STUDIO */
          <PredictRiskView
            currentLocation={activeLocation}
            homeLocation={homeLocation}
            locationTab={locationTab}
            onSwitchToMyLocation={handleSwitchToMyLocation}
            onSwitchToExplore={handleSwitchToExplore}
            onUpdateHomeLocation={handleUpdateHomeLocation}
            params={params}
            prediction={prediction}
            onBackToDashboard={() => setActiveTab('dashboard')}
            onLocationChange={handleLocationTelemetrySync}
            onOpenPerformance={() => setActiveTab('performance')}
          />
        ) : activeTab === 'performance' ? (
          /* FULL-PAGE INTERACTIVE MODEL PERFORMANCE & EVALUATION STUDIO */
          <ModelPerformanceView
            metrics={modelMetrics}
            onBackToDashboard={() => setActiveTab('dashboard')}
            onOpenPredict={() => setActiveTab('predict')}
          />
        ) : activeTab === 'historical' ? (
          /* FULL-PAGE HISTORICAL DATA & DISASTER REGISTRY VIEW */
          <HistoricalDataView
            currentLocation={activeLocation}
            onBackToDashboard={() => setActiveTab('dashboard')}
            onOpenCyclone={(cycId) => {
              if (cycId) setSelectedCycloneIdForView(cycId);
              setActiveTab('cyclone');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        ) : activeTab === 'alerts' || activeTab === 'reports' ? (
          /* FULL-PAGE ALERTS SCORING & 7-DAY RAINFALL REPORTS VIEW */
          <AlertsReportsView
            currentLocation={activeLocation}
            params={params}
            prediction={prediction}
            onBackToDashboard={() => setActiveTab('dashboard')}
            onLocationChange={handleLocationTelemetrySync}
            onOpenCyclone={(cycId) => {
              if (cycId) setSelectedCycloneIdForView(cycId);
              setActiveTab('cyclone');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        ) : activeTab === 'explainer' ? (
          /* FULL-PAGE AI EXPLAINER & EVACUATION PROTOCOLS + SYLLABUS AUDIT (CO4 | L6) */
          <AiExplainerView
            currentLocation={activeLocation}
            params={params}
            prediction={prediction}
            onBackToDashboard={() => setActiveTab('dashboard')}
            onOpenPredict={() => setActiveTab('predict')}
            onOpenMap={() => setActiveTab('map')}
            onOpenPerformance={() => setActiveTab('performance')}
          />
        ) : activeTab === 'about' ? (
          /* FULL-PAGE ABOUT PROJECT & ARCHITECTURE GUIDE VIEW */
          <AboutProjectView
            onBackToDashboard={() => setActiveTab('dashboard')}
          />
        ) : (
          /* STANDARD DASHBOARD VIEW */

          <div className="dashboard-content">
            {/* HERO DISASTER RADAR & ANTHROPOMORPHIC 3D AI RESCUE GUARDIAN */}
            <section className="command-hero-section">
              <div className="command-hero-left">
                <div className="hero-eyebrow">
                  <span className="live-pulsing-dot" />
                  <span>SATELLITE METEOROLOGICAL INTELLIGENCE</span>
                </div>
                <h2 className="hero-main-title">
                  Predict Flood Risk <span style={{ color: '#38bdf8' }}>Before It Becomes a Disaster.</span>
                </h2>
                <p className="hero-description">
                  Real-time meteorological, topographical and environmental intelligence powered by calibrated machine learning. Ingesting live Open-Meteo & Copernicus global satellite telemetry.
                </p>
                <div className="hero-cta-group">
                  <button className="primary-cta-btn" onClick={() => handleSelectTab('predict')}>
                    <span>⚡ Predict Risk Studio</span>
                  </button>
                  <button className="secondary-cta-btn" onClick={() => handleSelectTab('cyclone')} style={{ borderColor: 'rgba(56, 189, 248, 0.45)', color: '#38bdf8' }}>
                    <span>🌀 Cyclone & Coastal Risk</span>
                  </button>
                  <button className="secondary-cta-btn" onClick={() => handleSelectTab('map')}>
                    <span>🌐 3D World Globe & GIS</span>
                  </button>
                  <button className="secondary-cta-btn" onClick={() => handleSelectTab('evacuation')} style={{ borderColor: 'rgba(16, 185, 129, 0.4)', color: '#10b981' }}>
                    <span>🛡️ Offline Evacuation & Roads</span>
                  </button>
                </div>
                <div className="hero-features-strip">
                  <span>✓ 15 Hydrological Features</span>
                  <span>✓ Native XGBoost (T*=0.55)</span>
                  <span>✓ 100% Dynamic Open-Meteo</span>
                </div>
              </div>
              <div className="command-hero-right">
                <SplineAiGuardian
                  probability={prediction.probability}
                  riskLevel={prediction.riskLevel}
                  rainfall24h={params.rainfall24h}
                  elevation={params.elevation}
                  location={params.location}
                />
              </div>
            </section>

            {/* TOP 4 METRICS CARDS */}
            <TopMetrics
              probability={prediction.probability}
              riskLevel={prediction.riskLevel}
              location={prediction.location}
              latitude={prediction.latitude}
              longitude={prediction.longitude}
              recommendation={prediction.recommendation}
              locationTab={locationTab}
              homeLocation={homeLocation}
              onSwitchToMyLocation={handleSwitchToMyLocation}
              onOpenExplainer={() => setActiveTab('explainer')}
            />

            {/* TWO-COLUMN GRID */}
            <div className="main-grid">
              {/* LEFT COLUMN: Input Parameters & Top Risk Factors */}
              <div className="left-column">
                <InputParameters
                  params={params}
                  homeLocation={homeLocation}
                  activeLocation={activeLocation}
                  locationTab={locationTab}
                  onSwitchToMyLocation={handleSwitchToMyLocation}
                  onSwitchToExplore={handleSwitchToExplore}
                  onUpdateHomeLocation={handleUpdateHomeLocation}
                  onExploreLocation={(loc) => handleLocationTelemetrySync(loc, null, null, true)}
                  onChange={handleParamChange}
                  onPredict={handlePredict}
                  isLoading={isLoading}
                  onOpenPredictStudio={() => setActiveTab('predict')}
                />

                <RiskFactors factors={prediction.riskFactors} />
              </div>

              {/* RIGHT COLUMN: Risk Map, Model Performance & Recent Predictions */}
              <div className="right-column">
                <RiskMap
                  stations={stations}
                  onSelectStation={handleSelectStation}
                  onOpenMiraMap={() => setActiveTab('map')}
                  activeLocation={activeLocation}
                />

                <div className="bottom-split-grid">
                  <ModelPerformance
                    metrics={modelMetrics}
                    onOpenFullPerformance={() => setActiveTab('performance')}
                  />
                  <RecentPredictions predictions={recentPredictions} />
                </div>

              </div>
            </div>

            {/* FOOTER BANNER */}
            <InfoBanner />
          </div>
        )}
      </main>

      {/* REUSABLE MODAL (FOR FLOATING AUDIT/INSPECTIONS) */}
      <Modal
        isOpen={modalState.isOpen}
        type={modalState.type}
        onClose={() => setModalState({ isOpen: false, type: null })}
        currentLocation={activeLocation}
        params={params}
        prediction={prediction}
        onLocationChange={handleLocationTelemetrySync}
      />

      {/* DEDICATED PWA & MOBILE/PC APP INSTALLATION MODAL */}
      <InstallAppModal
        isOpen={isDownloadModalOpen}
        onClose={() => setIsDownloadModalOpen(false)}
      />

    </div>
  );
}
