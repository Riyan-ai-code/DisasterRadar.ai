import React, { useState, useEffect, useRef, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  fetchActiveCyclones,
  fetchHistoricalCyclones,
  fetchCycloneTrackDetail,
  fetchCycloneCoastalExposure,
  evaluateCompoundCycloneFloodRisk,
  fetchDopplerRadarConfig
} from '../services/api';

const IMD_CATEGORY_STYLE = {
  LPA: { color: '#64748b', bg: 'rgba(100, 116, 139, 0.16)', border: 'rgba(100, 116, 139, 0.4)', label: 'Low Pressure Area' },
  D: { color: '#38bdf8', bg: 'rgba(56, 189, 248, 0.16)', border: 'rgba(56, 189, 248, 0.4)', label: 'Depression' },
  DD: { color: '#eab308', bg: 'rgba(234, 179, 8, 0.16)', border: 'rgba(234, 179, 8, 0.45)', label: 'Deep Depression' },
  CS: { color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.16)', border: 'rgba(245, 158, 11, 0.45)', label: 'Cyclonic Storm' },
  SCS: { color: '#f97316', bg: 'rgba(249, 115, 22, 0.18)', border: 'rgba(249, 115, 22, 0.5)', label: 'Severe Cyclonic Storm' },
  VSCS: { color: '#ef4444', bg: 'rgba(239, 68, 68, 0.18)', border: 'rgba(239, 68, 68, 0.55)', label: 'Very Severe Cyclonic Storm' },
  ESCS: { color: '#e11d48', bg: 'rgba(225, 29, 72, 0.2)', border: 'rgba(225, 29, 72, 0.6)', label: 'Extremely Severe Cyclonic Storm' },
  SuCS: { color: '#a855f7', bg: 'rgba(168, 85, 247, 0.22)', border: 'rgba(168, 85, 247, 0.65)', label: 'Super Cyclonic Storm' }
};

function getImdStyle(code) {
  return IMD_CATEGORY_STYLE[code] || IMD_CATEGORY_STYLE.CS;
}

export default function CycloneMonitorView({
  initialCycloneId = null,
  onBackToDashboard,
  onSelectLocationForFloodPredict
}) {
  const [viewMode, setViewMode] = useState(initialCycloneId ? 'historical' : 'live'); // 'live' | 'historical'
  const [activeBasinData, setActiveBasinData] = useState(null);
  const [historicalList, setHistoricalList] = useState([]);
  const [selectedCycloneId, setSelectedCycloneId] = useState(initialCycloneId || 'nio-2023-michaung');
  const [cycloneDetail, setCycloneDetail] = useState(null);
  const [coastalExposure, setCoastalExposure] = useState(null);
  const [selectedDistrictId, setSelectedDistrictId] = useState(null);
  const [compoundRisk, setCompoundRisk] = useState(null);
  const [isLoadingCompound, setIsLoadingCompound] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingTrack, setIsLoadingTrack] = useState(false);

  // Map Layer Toggles
  const [layers, setLayers] = useState({
    observedTrack: true,
    forecastTrack: true,
    uncertaintyCone: true,
    windRadii: true,
    coastalStations: true,
    dopplerRadar: true
  });
  const [radarConfig, setRadarConfig] = useState(null);

  // Leaflet Map Refs
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const trackLayerGroupRef = useRef(null);
  const radarTileLayerRef = useRef(null);

  const runCompoundBridgeForDistrict = useCallback(async (cycloneId, districtObj) => {
    if (!cycloneId || !districtObj) return;
    setIsLoadingCompound(true);
    try {
      const res = await evaluateCompoundCycloneFloodRisk({
        cycloneId,
        districtId: districtObj.districtId,
        latitude: districtObj.latitude,
        longitude: districtObj.longitude,
        locationName: `${districtObj.districtName}, ${districtObj.state}`,
        elevationM: districtObj.elevationM,
        overrideRainfall24hMm: districtObj.estimatedRainfall24hMm,
        overrideRainfall72hMm: districtObj.estimatedRainfall72hMm
      });
      if (res) setCompoundRisk(res);
    } catch (err) {
      console.warn('Error evaluating compound cyclone-flood risk:', err);
    } finally {
      setIsLoadingCompound(false);
    }
  }, []);

  const loadCycloneTrack = useCallback(async (id) => {
    if (!id) return;
    setIsLoadingTrack(true);
    try {
      const [detail, exposureRes] = await Promise.all([
        fetchCycloneTrackDetail(id),
        fetchCycloneCoastalExposure(id)
      ]);
      if (detail) {
        setCycloneDetail(detail);
      }
      if (exposureRes) {
        setCoastalExposure(exposureRes);
        const topDistrict = exposureRes.districts?.[0];
        if (topDistrict) {
          setSelectedDistrictId(topDistrict.districtId);
          await runCompoundBridgeForDistrict(id, topDistrict);
        }
      }
    } catch (err) {
      console.warn('Error loading cyclone track detail:', err);
    } finally {
      setIsLoadingTrack(false);
    }
  }, [runCompoundBridgeForDistrict]);

  // Initial Load of Active Basin Status, Historical Archive & Radar Config
  useEffect(() => {
    let mounted = true;
    async function initCycloneModule() {
      setIsLoading(true);
      try {
        const [activeRes, histRes, radarRes] = await Promise.all([
          fetchActiveCyclones(false),
          fetchHistoricalCyclones(),
          fetchDopplerRadarConfig()
        ]);
        if (!mounted) return;

        setActiveBasinData(activeRes);
        const validHist = Array.isArray(histRes) ? histRes : [];
        setHistoricalList(validHist);
        if (radarRes) setRadarConfig(radarRes);

        if (initialCycloneId) {
          setSelectedCycloneId(initialCycloneId);
          setViewMode('historical');
          await loadCycloneTrack(initialCycloneId);
        } else if (activeRes?.activeCyclones?.length > 0) {
          const firstActiveId = activeRes.activeCyclones[0].id;
          setSelectedCycloneId(firstActiveId);
          setViewMode('live');
          await loadCycloneTrack(firstActiveId);
        } else if (validHist.length > 0) {
          const defaultHistId = validHist[0].id;
          setSelectedCycloneId(defaultHistId);
          await loadCycloneTrack(defaultHistId);
        }
      } catch (err) {
        console.warn('Cyclone initialization error:', err);
      } finally {
        if (mounted) setIsLoading(false);
      }
    }
    initCycloneModule();
    return () => { mounted = false; };
  }, [loadCycloneTrack, initialCycloneId]);

  // Initialize Leaflet Map over North Indian Ocean (Bay of Bengal & Arabian Sea)
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [15.5, 80.5],
      zoom: 5,
      minZoom: 3,
      maxZoom: 14,
      zoomControl: true
    });

    // Dark CartoDB / OSM Nautical-style Basemap for high contrast trajectory lines
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors &copy; CARTO | IMD RSMC / GDACS'
    }).addTo(map);

    const group = L.layerGroup().addTo(map);
    trackLayerGroupRef.current = group;
    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
      trackLayerGroupRef.current = null;
      radarTileLayerRef.current = null;
    };
  }, []);

  // Manage Live RainViewer Doppler Radar Overlay
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (radarTileLayerRef.current) {
      map.removeLayer(radarTileLayerRef.current);
      radarTileLayerRef.current = null;
    }

    if (layers.dopplerRadar && radarConfig?.tile_url) {
      radarTileLayerRef.current = L.tileLayer(radarConfig.tile_url, {
        opacity: 0.45,
        zIndex: 200
      }).addTo(map);
    }
  }, [layers.dopplerRadar, radarConfig]);

  // Render Cyclone Trajectory, Forecast Cone, Wind Radii, and Coastal Stations
  useEffect(() => {
    const map = mapInstanceRef.current;
    const group = trackLayerGroupRef.current;
    if (!map || !group) return;

    group.clearLayers();
    const boundsPoints = [];

    // 1. Render Indian Maritime Coastal Stations
    if (layers.coastalStations && activeBasinData?.coastalStationsTelemetry) {
      activeBasinData.coastalStationsTelemetry.forEach((st) => {
        const isElevated = st.windSpeedKmh >= 40;
        const stColor = isElevated ? '#f59e0b' : '#10b981';

        const stIcon = L.divIcon({
          className: 'coastal-maritime-marker',
          html: `
            <div style="
              width: 12px; height: 12px; border-radius: 3px;
              background: ${stColor}; border: 2px solid #ffffff;
              box-shadow: 0 0 8px ${stColor};
            "></div>
          `,
          iconSize: [12, 12],
          iconAnchor: [6, 6]
        });

        const marker = L.marker([st.latitude, st.longitude], { icon: stIcon }).addTo(group);
        marker.bindPopup(`
          <div style="font-family: Inter, sans-serif; min-width: 200px; color: #0f172a;">
            <div style="font-size: 0.68rem; font-weight: 700; color: #0284c7; text-transform: uppercase;">
              ⚓ Indian Maritime Observatory (${st.basin})
            </div>
            <div style="font-size: 0.9rem; font-weight: 800; margin: 2px 0 6px;">${st.stationName}</div>
            <div style="font-size: 0.76rem; line-height: 1.5;">
              <div><strong>10m Sustained Wind:</strong> ${st.windSpeedKmh} km/h (Gusts: ${st.windGustsKmh} km/h)</div>
              <div><strong>Sea-Level Pressure:</strong> ${st.surfacePressureHpa} hPa</div>
              <div><strong>24h Rainfall:</strong> ${st.rainfall24hMm} mm</div>
              <div><strong>IMD Status:</strong> <span style="color:${stColor};font-weight:700;">${st.imdWindStatus}</span></div>
            </div>
          </div>
        `);
      });
    }

    if (!cycloneDetail) return;

    const { event, observedTrack = [], currentPosition, forecastTrack = [], uncertaintyConeGeoJSON } = cycloneDetail;

    // 2. Render Official Forecast Uncertainty Cone Polygon
    if (layers.uncertaintyCone && uncertaintyConeGeoJSON) {
      try {
        L.geoJSON(uncertaintyConeGeoJSON, {
          style: {
            color: '#f59e0b',
            weight: 1.5,
            dashArray: '5, 5',
            fillColor: '#f59e0b',
            fillOpacity: 0.16
          }
        })
          .bindTooltip('Official RSMC / WMO Forecast Track Uncertainty Cone', { sticky: true })
          .addTo(group);
      } catch (e) {
        console.warn('Error rendering uncertainty cone GeoJSON:', e);
      }
    }

    // 3. Render Observed Historical Track (Solid Polyline + Intensity Nodes)
    if (layers.observedTrack && observedTrack.length > 0) {
      const obsLatLngs = observedTrack.map(pt => [pt.latitude, pt.longitude]);
      obsLatLngs.forEach(ll => boundsPoints.push(ll));

      L.polyline(obsLatLngs, {
        color: '#38bdf8',
        weight: 3.5,
        opacity: 0.95
      }).addTo(group);

      observedTrack.forEach((pt, idx) => {
        const isCurrent = idx === observedTrack.length - 1;
        const catStyle = getImdStyle(pt.imdCategory);

        if (!isCurrent) {
          const nodeMarker = L.circleMarker([pt.latitude, pt.longitude], {
            radius: 6,
            fillColor: catStyle.color,
            color: '#ffffff',
            weight: 1.8,
            fillOpacity: 0.95
          }).addTo(group);

          nodeMarker.bindPopup(`
            <div style="font-family: Inter, sans-serif; min-width: 195px; color: #0f172a;">
              <div style="font-size: 0.66rem; font-weight: 800; color: #0284c7; text-transform: uppercase;">
                ✓ Observed Best-Track Position
              </div>
              <div style="font-size: 0.88rem; font-weight: 800; margin: 2px 0;">
                Cyclone ${event.stormName} (${pt.imdCategory})
              </div>
              <div style="font-size: 0.74rem; color: #475569; margin-bottom: 6px;">${pt.timestampUtc}</div>
              <div style="font-size: 0.76rem; line-height: 1.45;">
                <div><strong>Coordinates:</strong> ${pt.latitude.toFixed(2)}°N, ${pt.longitude.toFixed(2)}°E</div>
                <div><strong>Sustained Wind:</strong> ${pt.windSpeedKmh} km/h (${pt.windSpeedKt} kt)</div>
                <div><strong>Central Pressure:</strong> ${pt.pressureHpa} hPa</div>
                <div><strong>IMD Grade:</strong> <strong style="color:${catStyle.color};">${pt.imdClassification}</strong></div>
              </div>
            </div>
          `);
        }
      });
    }

    // 4. Render Current Vortex Center & Wind Field Radii (34kt Gale / 50kt Storm / 64kt Hurricane-Force)
    if (currentPosition) {
      const curLL = [currentPosition.latitude, currentPosition.longitude];
      boundsPoints.push(curLL);
      const curStyle = getImdStyle(currentPosition.imdCategory);

      if (layers.windRadii) {
        // 34-knot Gale Wind Radius (~165 km)
        L.circle(curLL, {
          radius: 165000,
          color: '#eab308',
          weight: 1,
          dashArray: '4, 4',
          fillColor: '#eab308',
          fillOpacity: 0.06
        }).bindTooltip('34-kt (62 km/h) Gale Wind Field Swath').addTo(group);

        // 50-knot Storm Force Wind Radius (~95 km) if SCS or stronger
        if (currentPosition.windSpeedKt >= 48) {
          L.circle(curLL, {
            radius: 95000,
            color: '#f97316',
            weight: 1.2,
            fillColor: '#f97316',
            fillOpacity: 0.1
          }).bindTooltip('50-kt (90 km/h) Storm Wind Field Swath').addTo(group);
        }

        // 64-knot Very Severe Inner Core Radius (~50 km) if VSCS or stronger
        if (currentPosition.windSpeedKt >= 64) {
          L.circle(curLL, {
            radius: 50000,
            color: '#ef4444',
            weight: 1.5,
            fillColor: '#ef4444',
            fillOpacity: 0.18
          }).bindTooltip('64-kt (118 km/h) Destructive Inner Eye Wall').addTo(group);
        }
      }

      const vortexIcon = L.divIcon({
        className: 'cyclone-vortex-beacon',
        html: `
          <div style="position:relative; width:38px; height:38px; display:flex; align-items:center; justify-content:center;">
            <div style="position:absolute; width:38px; height:38px; border-radius:50%; background:${curStyle.color}; opacity:0.35; animation:pulse 1.6s infinite;"></div>
            <div style="
              width:24px; height:24px; border-radius:50%;
              background:${curStyle.color}; border:2.5px solid #ffffff;
              box-shadow:0 0 14px ${curStyle.color};
              display:flex; align-items:center; justify-content:center;
              color:#ffffff; font-size:13px; font-weight:900;
            ">🌀</div>
          </div>
        `,
        iconSize: [38, 38],
        iconAnchor: [19, 19]
      });

      const curMarker = L.marker(curLL, { icon: vortexIcon }).addTo(group);
      curMarker.bindPopup(`
        <div style="font-family: Inter, sans-serif; min-width: 215px; color: #0f172a;">
          <div style="font-size: 0.68rem; font-weight: 800; color: ${curStyle.color}; text-transform: uppercase;">
            🌀 Active Vortex Center (${event.status === 'ACTIVE' ? 'LIVE' : 'PEAK ARCHIVE POSITION'})
          </div>
          <div style="font-size: 0.95rem; font-weight: 900; margin: 2px 0;">
            Cyclone ${event.stormName}
          </div>
          <div style="font-size: 0.74rem; color: #475569; margin-bottom: 6px;">${currentPosition.timestampUtc}</div>
          <div style="font-size: 0.76rem; line-height: 1.5;">
            <div><strong>IMD Category:</strong> <strong style="color:${curStyle.color};">${currentPosition.imdClassification}</strong></div>
            <div><strong>Max Sustained Wind:</strong> ${currentPosition.windSpeedKmh} km/h (${currentPosition.windSpeedKt} kt)</div>
            <div><strong>Central Pressure:</strong> ${currentPosition.pressureHpa} hPa</div>
            <div><strong>Movement:</strong> ${event.movementDirectionCardinal} at ${event.movementSpeedKmh} km/h</div>
            <div><strong>Coast Proximity:</strong> ${event.distanceToIndianCoastKm} km from ${event.nearestCoastalReference}</div>
          </div>
        </div>
      `);
    }

    // 5. Render Official Forecast Trajectory (Dashed Polyline + Hollow Forecast Nodes)
    if (layers.forecastTrack && forecastTrack.length > 0) {
      const anchor = currentPosition
        ? [[currentPosition.latitude, currentPosition.longitude]]
        : [];
      const fcstLatLngs = [
        ...anchor,
        ...forecastTrack.map(pt => [pt.latitude, pt.longitude])
      ];
      forecastTrack.forEach(pt => boundsPoints.push([pt.latitude, pt.longitude]));

      L.polyline(fcstLatLngs, {
        color: '#f59e0b',
        weight: 3,
        dashArray: '8, 6',
        opacity: 0.95
      }).addTo(group);

      forecastTrack.forEach((pt) => {
        const fStyle = getImdStyle(pt.imdCategory);
        const fIcon = L.divIcon({
          className: 'forecast-track-node',
          html: `
            <div style="display:flex; flex-direction:column; align-items:center;">
              <div style="
                width:14px; height:14px; border-radius:50%;
                background:#0f172a; border:3px solid ${fStyle.color};
                box-shadow:0 0 8px ${fStyle.color};
              "></div>
              <span style="
                margin-top:2px; padding:1px 4px; border-radius:3px;
                background:rgba(15,23,42,0.9); color:#fef3c7;
                border:1px solid rgba(245,158,11,0.4);
                font-size:9px; font-weight:800; white-space:nowrap;
              ">+${pt.forecastHour}h</span>
            </div>
          `,
          iconSize: [36, 30],
          iconAnchor: [18, 7]
        });

        const fMarker = L.marker([pt.latitude, pt.longitude], { icon: fIcon }).addTo(group);
        fMarker.bindPopup(`
          <div style="font-family: Inter, sans-serif; min-width: 205px; color: #0f172a;">
            <div style="font-size: 0.66rem; font-weight: 800; color: #d97706; text-transform: uppercase;">
              🎯 Official RSMC Forecast (+${pt.forecastHour} Hours)
            </div>
            <div style="font-size: 0.88rem; font-weight: 800; margin: 2px 0;">
              Cyclone ${event.stormName} Forecast
            </div>
            <div style="font-size: 0.74rem; color: #475569; margin-bottom: 6px;">Valid: ${pt.timestampUtc}</div>
            <div style="font-size: 0.76rem; line-height: 1.45;">
              <div><strong>Forecast Position:</strong> ${pt.latitude.toFixed(2)}°N, ${pt.longitude.toFixed(2)}°E</div>
              <div><strong>Forecast Wind:</strong> ${pt.windSpeedKmh} km/h (${pt.windSpeedKt} kt)</div>
              <div><strong>Forecast Pressure:</strong> ${pt.pressureHpa} hPa</div>
              <div><strong>IMD Classification:</strong> <strong style="color:${fStyle.color};">${pt.imdClassification}</strong></div>
              <div><strong>Track Error Radius:</strong> ±${pt.uncertaintyRadiusKm} km</div>
            </div>
          </div>
        `);
      });
    }

    if (boundsPoints.length >= 2) {
      try {
        map.fitBounds(L.latLngBounds(boundsPoints).pad(0.22), { maxZoom: 7 });
      } catch (e) {}
    }
  }, [cycloneDetail, activeBasinData, layers]);

  const handleSelectCyclone = (id) => {
    setSelectedCycloneId(id);
    loadCycloneTrack(id);
  };

  const handleSimulateCoastalFloodImpact = () => {
    if (!cycloneDetail?.event || !onSelectLocationForFloodPredict) return;
    const ev = cycloneDetail.event;
    const refParts = (ev.nearestCoastalReference || 'Chennai, Tamil Nadu').split(',');
    onSelectLocationForFloodPredict({
      name: refParts[0].trim(),
      country: 'India',
      lat: ev.currentLatitude,
      lng: ev.currentLongitude,
      r24: ev.peakRainfall24hMm || 240.0,
      r72: ev.peakRainfall72hMm || 380.0,
      wind: ev.maxSustainedWindKmh,
      pressure: ev.minCentralPressureHpa || 980.0,
      elev: 6.0,
      temp: 26.0,
      hum: 92.0,
      isRaining: true,
      currentRainfall: 28.0
    });
  };

  const ev = cycloneDetail?.event;
  const curPos = cycloneDetail?.currentPosition;
  const trend = cycloneDetail?.intensityTrend;
  const prov = cycloneDetail?.provenance || activeBasinData?.provenance;
  const activeStyle = getImdStyle(ev?.imdCategory);

  const allTimelinePoints = [
    ...(cycloneDetail?.observedTrack || []),
    ...(cycloneDetail?.forecastTrack || [])
  ];

  return (
    <div style={{ padding: '20px 24px 40px', color: '#f8fafc', maxWidth: '1600px', margin: '0 auto' }}>
      {/* TOP COMMAND HEADER */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '16px',
        marginBottom: '18px',
        padding: '18px 22px',
        background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, rgba(30, 27, 75, 0.85) 100%)',
        border: '1px solid rgba(56, 189, 248, 0.25)',
        borderRadius: '14px'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
            <span style={{
              padding: '3px 10px',
              borderRadius: '20px',
              fontSize: '0.7rem',
              fontWeight: 800,
              background: 'rgba(245, 158, 11, 0.18)',
              color: '#fbbf24',
              border: '1px solid rgba(245, 158, 11, 0.4)',
              letterSpacing: '0.05em'
            }}>
              🌀 CYCLONE INTELLIGENCE ENGINE (RSMC NEW DELHI / GDACS / IBTrACS)
            </span>
            {prov && (
              <span style={{
                padding: '3px 9px',
                borderRadius: '20px',
                fontSize: '0.68rem',
                fontWeight: 700,
                background: prov.isSimulatedOrHistorical ? 'rgba(56, 189, 248, 0.15)' : 'rgba(16, 185, 129, 0.18)',
                color: prov.isSimulatedOrHistorical ? '#38bdf8' : '#10b981',
                border: `1px solid ${prov.isSimulatedOrHistorical ? 'rgba(56, 189, 248, 0.35)' : 'rgba(16, 185, 129, 0.4)'}`
              }}>
                {prov.isSimulatedOrHistorical ? '📚 VERIFIED ARCHIVE REPLAY' : `● ${prov.freshnessStatus}`}
              </span>
            )}
          </div>
          <h2 style={{ margin: 0, fontSize: '1.45rem', fontWeight: 800, letterSpacing: '-0.02em' }}>
            North Indian Ocean Cyclone Tracking & Trajectory Intelligence
          </h2>
          <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: '#94a3b8' }}>
            Monitoring Bay of Bengal (`BOB`) and Arabian Sea (`ARB`) cyclonic disturbances, official forecast cones, and XGBoost-SHIPS Rapid Intensification (RI) telemetry.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <div style={{
            display: 'flex',
            background: 'rgba(8, 12, 22, 0.8)',
            padding: '4px',
            borderRadius: '8px',
            border: '1px solid rgba(255,255,255,0.1)'
          }}>
            <button
              onClick={() => setViewMode('live')}
              style={{
                padding: '7px 14px',
                borderRadius: '6px',
                border: 'none',
                fontSize: '0.76rem',
                fontWeight: 700,
                cursor: 'pointer',
                background: viewMode === 'live' ? '#0284c7' : 'transparent',
                color: viewMode === 'live' ? '#ffffff' : '#94a3b8'
              }}
            >
              📡 Live Basin Watch ({activeBasinData?.activeCount || 0})
            </button>
            <button
              onClick={() => setViewMode('historical')}
              style={{
                padding: '7px 14px',
                borderRadius: '6px',
                border: 'none',
                fontSize: '0.76rem',
                fontWeight: 700,
                cursor: 'pointer',
                background: viewMode === 'historical' ? '#d97706' : 'transparent',
                color: viewMode === 'historical' ? '#ffffff' : '#94a3b8'
              }}
            >
              🗂️ Verified IMD Cyclone Archive ({historicalList.length})
            </button>
          </div>

          <button
            onClick={onBackToDashboard}
            style={{
              padding: '8px 14px',
              borderRadius: '8px',
              background: 'rgba(30, 41, 59, 0.75)',
              border: '1px solid rgba(255,255,255,0.15)',
              color: '#e2e8f0',
              fontSize: '0.76rem',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            ← Flood Dashboard
          </button>
        </div>
      </div>

      {/* LIVE BASIN STATUS BANNER */}
      {activeBasinData && (
        <div style={{
          marginBottom: '18px',
          padding: '12px 18px',
          borderRadius: '10px',
          background: activeBasinData.activeCount > 0
            ? 'rgba(239, 68, 68, 0.14)'
            : 'rgba(16, 185, 129, 0.10)',
          border: `1px solid ${activeBasinData.activeCount > 0 ? 'rgba(239, 68, 68, 0.45)' : 'rgba(16, 185, 129, 0.3)'}`,
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              background: activeBasinData.activeCount > 0 ? '#ef4444' : '#10b981',
              boxShadow: `0 0 10px ${activeBasinData.activeCount > 0 ? '#ef4444' : '#10b981'}`
            }} />
            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#f8fafc' }}>
              {activeBasinData.basinHeadline}
            </span>
          </div>
          <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
            Source: {activeBasinData.provenance?.sourceName} • Updated {new Date(activeBasinData.provenance?.fetchedAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      )}

      {/* CYCLONE SELECTOR BAR */}
      <div style={{
        marginBottom: '18px',
        padding: '14px 18px',
        background: 'rgba(15, 23, 42, 0.85)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '12px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
          <span style={{ fontSize: '0.76rem', fontWeight: 800, color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {viewMode === 'live' && activeBasinData?.activeCyclones?.length > 0
              ? 'Active North Indian Ocean Cyclonic Disturbances'
              : 'Select Verified North Indian Ocean Cyclone for Trajectory & Impact Analysis'}
          </span>
          <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
            Official 3-Minute Sustained Wind Scale (IMD RSMC New Delhi)
          </span>
        </div>

        <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '4px' }}>
          {(viewMode === 'live' && activeBasinData?.activeCyclones?.length > 0
            ? activeBasinData.activeCyclones
            : historicalList
          ).map((item) => {
            const isSelected = item.id === selectedCycloneId;
            const st = getImdStyle(item.imdCategory);
            return (
              <button
                key={item.id}
                onClick={() => handleSelectCyclone(item.id)}
                style={{
                  minWidth: '215px',
                  textAlign: 'left',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  background: isSelected ? 'rgba(30, 41, 59, 0.95)' : 'rgba(8, 12, 22, 0.65)',
                  border: isSelected ? `2px solid ${st.color}` : '1px solid rgba(255,255,255,0.08)',
                  color: '#f8fafc',
                  transition: 'all 0.18s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ fontWeight: 800, fontSize: '0.88rem' }}>🌀 {item.stormName}</span>
                  <span style={{
                    fontSize: '0.66rem',
                    fontWeight: 800,
                    padding: '2px 6px',
                    borderRadius: '4px',
                    background: st.bg,
                    color: st.color,
                    border: `1px solid ${st.border}`
                  }}>
                    {item.imdCategory}
                  </span>
                </div>
                <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                  {item.basinFullName} • {item.seasonYear}
                </div>
                <div style={{ fontSize: '0.72rem', color: '#cbd5e1', marginTop: '4px', fontWeight: 600 }}>
                  {item.maxSustainedWindKmh} km/h ({item.maxSustainedWindKt} kt) • {item.minCentralPressureHpa} hPa
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* TOP 4 CYCLONE METRICS STRIP */}
      {ev && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '14px',
          marginBottom: '18px'
        }}>
          {/* Card 1: Official IMD Classification */}
          <div style={{
            padding: '16px 18px',
            borderRadius: '12px',
            background: 'rgba(15, 23, 42, 0.9)',
            border: `1px solid ${activeStyle.border}`
          }}>
            <div style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>
              Official IMD Classification
            </div>
            <div style={{ fontSize: '1.15rem', fontWeight: 900, color: activeStyle.color, margin: '6px 0 4px' }}>
              {ev.imdClassification}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#cbd5e1' }}>
              Basin: <strong>{ev.basinFullName} ({ev.basin})</strong> • {ev.seasonYear}
            </div>
          </div>

          {/* Card 2: Max Sustained Wind & Central Pressure */}
          <div style={{
            padding: '16px 18px',
            borderRadius: '12px',
            background: 'rgba(15, 23, 42, 0.9)',
            border: '1px solid rgba(56, 189, 248, 0.22)'
          }}>
            <div style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>
              Peak Sustained Wind & Central Pressure
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#f8fafc', margin: '6px 0 4px' }}>
              {ev.maxSustainedWindKmh} km/h <span style={{ fontSize: '0.88rem', color: '#38bdf8' }}>({ev.maxSustainedWindKt} kt)</span>
            </div>
            <div style={{ fontSize: '0.75rem', color: '#cbd5e1' }}>
              Central Pressure: <strong>{ev.minCentralPressureHpa} hPa</strong> (ΔP: {Math.max(0, Math.round(1013 - (ev.minCentralPressureHpa || 1000)))} hPa)
            </div>
          </div>

          {/* Card 3: Kinematics & Coastal Distance */}
          <div style={{
            padding: '16px 18px',
            borderRadius: '12px',
            background: 'rgba(15, 23, 42, 0.9)',
            border: '1px solid rgba(56, 189, 248, 0.22)'
          }}>
            <div style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>
              Kinematics & Coastal Proximity
            </div>
            <div style={{ fontSize: '1.15rem', fontWeight: 900, color: '#f8fafc', margin: '6px 0 4px' }}>
              {ev.movementDirectionCardinal} ({ev.movementDirectionDeg}°) @ {ev.movementSpeedKmh} km/h
            </div>
            <div style={{ fontSize: '0.74rem', color: '#cbd5e1' }}>
              <strong>{ev.distanceToIndianCoastKm} km</strong> from {ev.nearestCoastalReference}
            </div>
          </div>

          {/* Card 4: XGBoost-SHIPS Rapid Intensification Index */}
          <div style={{
            padding: '16px 18px',
            borderRadius: '12px',
            background: 'rgba(15, 23, 42, 0.9)',
            border: '1px solid rgba(245, 158, 11, 0.35)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.7rem', color: '#fbbf24', textTransform: 'uppercase', fontWeight: 800 }}>
                ML Rapid Intensification (RI)
              </span>
              <span style={{
                fontSize: '0.62rem',
                padding: '1px 6px',
                borderRadius: '4px',
                background: 'rgba(245, 158, 11, 0.15)',
                color: '#fbbf24',
                fontWeight: 700
              }}>
                XGBoost-SHIPS
              </span>
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#f8fafc', margin: '6px 0 4px' }}>
              {trend?.riProbabilityPercent ?? 35.0}% <span style={{ fontSize: '0.82rem', color: '#fbbf24' }}>({trend?.riRiskTier || 'MODERATE'})</span>
            </div>
            <div style={{ fontSize: '0.74rem', color: '#cbd5e1' }}>
              24h ΔV: <strong>{trend?.windChange24hKt >= 0 ? `+${trend?.windChange24hKt}` : trend?.windChange24hKt} kt</strong> • 12h ΔP: <strong>{trend?.pressureChange12hHpa} hPa</strong>
            </div>
          </div>
        </div>
      )}

      {/* MAIN TWO-COLUMN LAYOUT: INTERACTIVE TRAJECTORY MAP + INTENSITY & COMPOUND BRIDGE */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1.65fr) minmax(340px, 1fr)',
        gap: '18px',
        alignItems: 'start'
      }}>
        {/* LEFT COLUMN: INTERACTIVE LEAFLET TRAJECTORY & CONE OF UNCERTAINTY MAP */}
        <div style={{
          background: 'rgba(15, 23, 42, 0.9)',
          border: '1px solid rgba(56, 189, 248, 0.2)',
          borderRadius: '14px',
          overflow: 'hidden'
        }}>
          {/* Map Header & Layer Controls */}
          <div style={{
            padding: '12px 16px',
            borderBottom: '1px solid rgba(255,255,255,0.08)',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '10px'
          }}>
            <div>
              <span style={{ fontSize: '0.88rem', fontWeight: 800, color: '#f8fafc' }}>
                🗺️ Interactive Cyclone Trajectory & Uncertainty Cone GIS
              </span>
              <span style={{ display: 'block', fontSize: '0.7rem', color: '#94a3b8' }}>
                Solid Cyan = Observed Track • Dashed Amber = Official Forecast • Shaded Polygon = RSMC Uncertainty Cone
              </span>
            </div>

            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {[
                { key: 'observedTrack', label: 'Observed Track' },
                { key: 'forecastTrack', label: 'Official Forecast' },
                { key: 'uncertaintyCone', label: 'Uncertainty Cone' },
                { key: 'windRadii', label: '34/50/64kt Radii' },
                { key: 'coastalStations', label: 'Maritime Observatories' },
                { key: 'dopplerRadar', label: '500m Doppler Radar' }
              ].map(ctrl => (
                <button
                  key={ctrl.key}
                  onClick={() => setLayers(prev => ({ ...prev, [ctrl.key]: !prev[ctrl.key] }))}
                  style={{
                    padding: '4px 9px',
                    borderRadius: '6px',
                    fontSize: '0.68rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    background: layers[ctrl.key] ? 'rgba(2, 132, 199, 0.25)' : 'rgba(30, 41, 59, 0.6)',
                    color: layers[ctrl.key] ? '#38bdf8' : '#64748b',
                    border: `1px solid ${layers[ctrl.key] ? 'rgba(56, 189, 248, 0.45)' : 'rgba(255,255,255,0.08)'}`
                  }}
                >
                  {layers[ctrl.key] ? '✓ ' : ''}{ctrl.label}
                </button>
              ))}
            </div>
          </div>

          {/* Map Canvas */}
          <div style={{ position: 'relative', height: '540px', width: '100%' }}>
            <div ref={mapContainerRef} style={{ height: '100%', width: '100%' }} />

            {(isLoading || isLoadingTrack) && (
              <div style={{
                position: 'absolute',
                inset: 0,
                background: 'rgba(8, 12, 22, 0.72)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 900,
                color: '#38bdf8',
                fontWeight: 700,
                fontSize: '0.88rem'
              }}>
                Synchronizing RSMC / IBTrACS Cyclone Trajectory & Wind Radii...
              </div>
            )}

            {/* Map Legend Overlay */}
            <div style={{
              position: 'absolute',
              bottom: '14px',
              left: '14px',
              zIndex: 800,
              background: 'rgba(8, 12, 22, 0.92)',
              border: '1px solid rgba(56, 189, 248, 0.25)',
              borderRadius: '10px',
              padding: '10px 12px',
              fontSize: '0.68rem',
              color: '#e2e8f0',
              maxWidth: '280px'
            }}>
              <div style={{ fontWeight: 800, color: '#38bdf8', marginBottom: '6px', textTransform: 'uppercase' }}>
                IMD Storm Classification & Track Legend
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 10px', marginBottom: '6px' }}>
                <div><span style={{ color: '#38bdf8' }}>●</span> Depression (D/DD)</div>
                <div><span style={{ color: '#f59e0b' }}>●</span> Cyclonic Storm (CS)</div>
                <div><span style={{ color: '#f97316' }}>●</span> Severe (SCS)</div>
                <div><span style={{ color: '#ef4444' }}>●</span> Very Severe (VSCS)</div>
                <div><span style={{ color: '#e11d48' }}>●</span> Extremely Severe</div>
                <div><span style={{ color: '#a855f7' }}>●</span> Super Cyclone (SuCS)</div>
              </div>
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '5px', color: '#94a3b8' }}>
                <div>━━━ Observed Track (Best-Track)</div>
                <div>╍╍╍ Official RSMC Forecast Track</div>
                <div>⚓ Green/Amber Squares: Coastal Observatories</div>
              </div>
            </div>
          </div>

          {/* Landfall & Impact Summary Footer */}
          {ev && (
            <div style={{
              padding: '14px 18px',
              borderTop: '1px solid rgba(255,255,255,0.08)',
              background: 'rgba(8, 12, 22, 0.6)',
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px'
            }}>
              <div style={{ flex: '1 1 420px' }}>
                <div style={{ fontSize: '0.74rem', fontWeight: 800, color: '#fbbf24' }}>
                  📍 Landfall Corridor: {ev.landfallLocation || ev.nearestCoastalReference}
                </div>
                <div style={{ fontSize: '0.76rem', color: '#cbd5e1', marginTop: '3px' }}>
                  {ev.impactSummary}
                </div>
              </div>

              {onSelectLocationForFloodPredict && (
                <button
                  onClick={handleSimulateCoastalFloodImpact}
                  style={{
                    padding: '9px 14px',
                    borderRadius: '8px',
                    background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                    border: '1px solid #38bdf8',
                    color: '#ffffff',
                    fontSize: '0.76rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap'
                  }}
                >
                  ⚡ Send Cyclone Rainfall ({ev.peakRainfall24hMm || 240}mm) to Flood ML Studio →
                </button>
              )}
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: CHRONOLOGICAL TRACK LEDGER, RI SHAP ATTRIBUTION & MARITIME TELEMETRY */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Panel 1: Chronological Observed & Official Forecast Positions */}
          <div style={{
            background: 'rgba(15, 23, 42, 0.9)',
            border: '1px solid rgba(56, 189, 248, 0.2)',
            borderRadius: '14px',
            padding: '16px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <span style={{ fontSize: '0.84rem', fontWeight: 800, color: '#f8fafc' }}>
                ⏱️ Track & Forecast Timeline ({allTimelinePoints.length} Points)
              </span>
              <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>
                Observed vs. Official Forecast
              </span>
            </div>

            <div style={{ maxHeight: '245px', overflowY: 'auto', paddingRight: '4px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.73rem' }}>
                <thead>
                  <tr style={{ color: '#94a3b8', borderBottom: '1px solid rgba(255,255,255,0.08)', textAlign: 'left' }}>
                    <th style={{ padding: '6px 4px' }}>Type / Lead</th>
                    <th style={{ padding: '6px 4px' }}>Coords</th>
                    <th style={{ padding: '6px 4px' }}>Wind</th>
                    <th style={{ padding: '6px 4px' }}>Press</th>
                    <th style={{ padding: '6px 4px' }}>IMD</th>
                  </tr>
                </thead>
                <tbody>
                  {allTimelinePoints.map((pt, i) => {
                    const isFcst = pt.pointType === 'OFFICIAL_FORECAST';
                    const st = getImdStyle(pt.imdCategory);
                    return (
                      <tr
                        key={`${pt.timestampUtc}-${i}`}
                        style={{
                          borderBottom: '1px solid rgba(255,255,255,0.05)',
                          background: isFcst ? 'rgba(245, 158, 11, 0.06)' : 'transparent'
                        }}
                      >
                        <td style={{ padding: '6px 4px', fontWeight: 700, color: isFcst ? '#fbbf24' : '#38bdf8' }}>
                          {isFcst ? `🎯 +${pt.forecastHour}h Fcst` : '✓ Observed'}
                          <div style={{ fontSize: '0.64rem', color: '#64748b', fontWeight: 500 }}>
                            {pt.timestampUtc.replace('T', ' ').slice(0, 16)}
                          </div>
                        </td>
                        <td style={{ padding: '6px 4px', color: '#e2e8f0' }}>
                          {pt.latitude.toFixed(1)}°N, {pt.longitude.toFixed(1)}°E
                        </td>
                        <td style={{ padding: '6px 4px', fontWeight: 700, color: '#f8fafc' }}>
                          {pt.windSpeedKmh} km/h
                          <span style={{ display: 'block', fontSize: '0.64rem', color: '#94a3b8' }}>
                            ({pt.windSpeedKt} kt)
                          </span>
                        </td>
                        <td style={{ padding: '6px 4px', color: '#cbd5e1' }}>
                          {pt.pressureHpa} hPa
                        </td>
                        <td style={{ padding: '6px 4px' }}>
                          <span style={{
                            padding: '2px 5px',
                            borderRadius: '4px',
                            fontSize: '0.64rem',
                            fontWeight: 800,
                            background: st.bg,
                            color: st.color,
                            border: `1px solid ${st.border}`
                          }}>
                            {pt.imdCategory}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Panel 2: XGBoost-SHIPS Rapid Intensification SHAP Attributions */}
          {trend && (
            <div style={{
              background: 'rgba(15, 23, 42, 0.9)',
              border: '1px solid rgba(245, 158, 11, 0.25)',
              borderRadius: '14px',
              padding: '16px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.84rem', fontWeight: 800, color: '#f8fafc' }}>
                  🧠 Rapid Intensification (RI) TreeSHAP Drivers
                </span>
                <span style={{
                  fontSize: '0.64rem',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  background: 'rgba(245, 158, 11, 0.16)',
                  color: '#fbbf24',
                  fontWeight: 700
                }}>
                  Experimental ML Diagnostic
                </span>
              </div>
              <p style={{ margin: '0 0 10px', fontSize: '0.72rem', color: '#94a3b8' }}>
                Evaluates 24-hour rapid intensification potential ($\Delta V \ge 30\text{ kt}$) from kinematic persistence, central pressure drop, and coastal land interaction:
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {(trend.topShapDrivers || []).map((d, idx) => {
                  const isPos = d.shapImpact >= 0;
                  const pctWidth = Math.min(100, Math.max(12, Math.round(Math.abs(d.shapImpact) * 240)));
                  return (
                    <div key={idx} style={{
                      padding: '8px 10px',
                      borderRadius: '8px',
                      background: 'rgba(8, 12, 22, 0.65)',
                      border: '1px solid rgba(255,255,255,0.06)'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.73rem', marginBottom: '4px' }}>
                        <span style={{ fontWeight: 700, color: '#e2e8f0' }}>{d.feature} ({d.value})</span>
                        <span style={{ fontWeight: 800, color: isPos ? '#f97316' : '#10b981' }}>
                          {d.shapImpact >= 0 ? `+${d.shapImpact}` : d.shapImpact} ({d.direction})
                        </span>
                      </div>
                      <div style={{ height: '5px', background: 'rgba(255,255,255,0.08)', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{
                          width: `${pctWidth}%`,
                          height: '100%',
                          background: isPos ? '#f97316' : '#10b981',
                          borderRadius: '3px'
                        }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Panel 3: Live Indian Maritime Coastal Observatories */}
          <div style={{
            background: 'rgba(15, 23, 42, 0.9)',
            border: '1px solid rgba(56, 189, 248, 0.2)',
            borderRadius: '14px',
            padding: '16px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <span style={{ fontSize: '0.84rem', fontWeight: 800, color: '#f8fafc' }}>
                ⚓ Live Indian Coastal Observatory Telemetry
              </span>
              <span style={{ fontSize: '0.68rem', color: '#10b981', fontWeight: 700 }}>
                ● Open-Meteo Live
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '210px', overflowY: 'auto' }}>
              {(activeBasinData?.coastalStationsTelemetry || []).map((st, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: '8px 10px',
                    borderRadius: '8px',
                    background: 'rgba(8, 12, 22, 0.65)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: '0.73rem'
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 700, color: '#f8fafc' }}>{st.stationName}</div>
                    <div style={{ fontSize: '0.66rem', color: '#94a3b8' }}>{st.basin} • {st.state}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 800, color: st.windSpeedKmh >= 40 ? '#f59e0b' : '#38bdf8' }}>
                      {st.windSpeedKmh} km/h <span style={{ fontSize: '0.65rem', color: '#94a3b8' }}>({st.surfacePressureHpa} hPa)</span>
                    </div>
                    <div style={{ fontSize: '0.64rem', color: '#10b981' }}>
                      24h Rain: {st.rainfall24hMm} mm
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* PHASE 3 & PHASE 4: COASTAL VULNERABILITY ASSESSMENT & COMPOUND CYCLONE-TO-FLOOD BRIDGE */}
      {coastalExposure && (
        <div style={{
          marginTop: '20px',
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1.35fr) minmax(340px, 1fr)',
          gap: '18px',
          alignItems: 'start'
        }}>
          {/* LEFT: PHASE 3 COASTAL DISTRICT VULNERABILITY MATRIX */}
          <div style={{
            background: 'rgba(15, 23, 42, 0.92)',
            border: '1px solid rgba(56, 189, 248, 0.22)',
            borderRadius: '14px',
            padding: '18px'
          }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '0.95rem', fontWeight: 800, color: '#f8fafc' }}>
                    🏖️ Coastal District Vulnerability & Exposure Assessment
                  </span>
                  <span style={{
                    fontSize: '0.64rem',
                    padding: '2px 8px',
                    borderRadius: '12px',
                    background: 'rgba(56, 189, 248, 0.14)',
                    color: '#38bdf8',
                    border: '1px solid rgba(56, 189, 248, 0.35)',
                    fontWeight: 800
                  }}>
                    Geographical Exposure Estimate
                  </span>
                </div>
                <p style={{ margin: '4px 0 0', fontSize: '0.73rem', color: '#94a3b8' }}>
                  Click any coastal district below to run the <strong>Compound Cyclone-to-Flood Bridge</strong> for that district.
                </p>
              </div>

              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <div style={{ padding: '6px 10px', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.14)', border: '1px solid rgba(239, 68, 68, 0.35)', fontSize: '0.72rem' }}>
                  <span style={{ color: '#fca5a5' }}>Critical Districts: </span>
                  <strong style={{ color: '#ef4444' }}>{coastalExposure.criticalDistrictsCount}</strong>
                </div>
                <div style={{ padding: '6px 10px', borderRadius: '8px', background: 'rgba(249, 115, 22, 0.14)', border: '1px solid rgba(249, 115, 22, 0.35)', fontSize: '0.72rem' }}>
                  <span style={{ color: '#fdba74' }}>High Exposure: </span>
                  <strong style={{ color: '#f97316' }}>{coastalExposure.highExposureDistrictsCount}</strong>
                </div>
                <div style={{ padding: '6px 10px', borderRadius: '8px', background: 'rgba(56, 189, 248, 0.14)', border: '1px solid rgba(56, 189, 248, 0.35)', fontSize: '0.72rem' }}>
                  <span style={{ color: '#bae6fd' }}>Exposed Pop: </span>
                  <strong style={{ color: '#38bdf8' }}>{coastalExposure.totalExposedPopulationLakhs} Lakhs</strong>
                </div>
              </div>
            </div>

            <div style={{ maxHeight: '340px', overflowY: 'auto', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.07)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.74rem' }}>
                <thead>
                  <tr style={{ background: 'rgba(8, 12, 22, 0.85)', color: '#94a3b8', textAlign: 'left', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                    <th style={{ padding: '8px 10px' }}>Coastal District (State)</th>
                    <th style={{ padding: '8px 8px' }}>Track Dist</th>
                    <th style={{ padding: '8px 8px' }}>Est. Wind</th>
                    <th style={{ padding: '8px 8px' }}>24h / 72h Rain</th>
                    <th style={{ padding: '8px 8px' }}>DEM Elev</th>
                    <th style={{ padding: '8px 8px' }}>Surge Index</th>
                    <th style={{ padding: '8px 10px' }}>Exposure Tier</th>
                  </tr>
                </thead>
                <tbody>
                  {(coastalExposure.districts || []).slice(0, 14).map((d) => {
                    const isSelected = d.districtId === selectedDistrictId;
                    const tierColor =
                      d.exposureTier === 'EXPOSURE_CRITICAL' ? '#ef4444' :
                      d.exposureTier === 'EXPOSURE_HIGH' ? '#f97316' :
                      d.exposureTier === 'EXPOSURE_MODERATE' ? '#eab308' : '#10b981';
                    return (
                      <tr
                        key={d.districtId}
                        onClick={() => {
                          setSelectedDistrictId(d.districtId);
                          runCompoundBridgeForDistrict(selectedCycloneId, d);
                        }}
                        style={{
                          cursor: 'pointer',
                          borderBottom: '1px solid rgba(255,255,255,0.05)',
                          background: isSelected ? 'rgba(2, 132, 199, 0.22)' : 'transparent',
                          transition: 'background 0.15s ease'
                        }}
                      >
                        <td style={{ padding: '8px 10px', fontWeight: 700, color: '#f8fafc' }}>
                          {isSelected ? '▶ ' : ''}{d.districtName}
                          <span style={{ display: 'block', fontSize: '0.65rem', color: '#94a3b8', fontWeight: 500 }}>
                            {d.state} • Pop: {d.populationLakhs}L
                          </span>
                        </td>
                        <td style={{ padding: '8px 8px', color: '#e2e8f0', fontWeight: 700 }}>
                          {d.minTrackDistanceKm} km
                        </td>
                        <td style={{ padding: '8px 8px', color: '#fbbf24', fontWeight: 700 }}>
                          {d.estimatedPeakWindKmh} km/h
                        </td>
                        <td style={{ padding: '8px 8px', color: '#38bdf8', fontWeight: 700 }}>
                          {d.estimatedRainfall24hMm} / {d.estimatedRainfall72hMm} mm
                        </td>
                        <td style={{ padding: '8px 8px', color: '#cbd5e1' }}>
                          {d.elevationM}m MSL
                        </td>
                        <td style={{ padding: '8px 8px', color: '#cbd5e1' }}>
                          {d.surgeVulnerabilityIndex}/100
                        </td>
                        <td style={{ padding: '8px 10px' }}>
                          <span style={{
                            padding: '2px 7px',
                            borderRadius: '4px',
                            fontSize: '0.65rem',
                            fontWeight: 800,
                            color: tierColor,
                            background: `${tierColor}22`,
                            border: `1px solid ${tierColor}66`
                          }}>
                            {d.exposureTier.replace('EXPOSURE_', '')} ({d.exposureScore})
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div style={{ marginTop: '10px', fontSize: '0.68rem', color: '#94a3b8', lineHeight: 1.45 }}>
              ⚠️ <strong>Distinction Notice:</strong> {coastalExposure.methodologyDisclaimer}
            </div>
          </div>

          {/* RIGHT: PHASE 4 COMPOUND CYCLONE-TO-FLOOD RISK BRIDGE */}
          <div style={{
            background: 'linear-gradient(145deg, rgba(15, 23, 42, 0.96) 0%, rgba(17, 24, 39, 0.95) 100%)',
            border: '1px solid rgba(56, 189, 248, 0.35)',
            borderRadius: '14px',
            padding: '18px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#38bdf8' }}>
                🌊 Compound Cyclone-to-Flood Super-Stack
              </span>
              <span style={{
                fontSize: '0.64rem',
                padding: '2px 7px',
                borderRadius: '4px',
                background: 'rgba(16, 185, 129, 0.16)',
                color: '#10b981',
                border: '1px solid rgba(16, 185, 129, 0.4)',
                fontWeight: 800
              }}>
                15-Feature XGBoost+RF Bridge
              </span>
            </div>

            {isLoadingCompound || !compoundRisk ? (
              <div style={{ padding: '32px 12px', textAlign: 'center', color: '#38bdf8', fontSize: '0.82rem', fontWeight: 700 }}>
                Evaluating Compound Cyclone Rainband + Coastal DEM in 15-Feature Flood Ensemble...
              </div>
            ) : (
              <>
                <div style={{
                  padding: '12px 14px',
                  borderRadius: '10px',
                  background: 'rgba(8, 12, 22, 0.75)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  marginBottom: '12px'
                }}>
                  <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Selected Coastal Target</div>
                  <div style={{ fontSize: '1.02rem', fontWeight: 900, color: '#f8fafc', margin: '2px 0 8px' }}>
                    📍 {compoundRisk.targetLocation} ({compoundRisk.elevationM}m MSL)
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div style={{ padding: '8px 10px', borderRadius: '8px', background: 'rgba(2, 132, 199, 0.14)', border: '1px solid rgba(56, 189, 248, 0.3)' }}>
                      <div style={{ fontSize: '0.66rem', color: '#bae6fd', textTransform: 'uppercase', fontWeight: 700 }}>
                        Flood ML Probability
                      </div>
                      <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#38bdf8', marginTop: '2px' }}>
                        {compoundRisk.floodModelProbability}% <span style={{ fontSize: '0.72rem' }}>({compoundRisk.floodModelRiskLevel})</span>
                      </div>
                      <div style={{ fontSize: '0.65rem', color: '#94a3b8' }}>
                        Rain: {compoundRisk.cycloneInducedRainfall24hMm}mm (24h) / {compoundRisk.cycloneInducedRainfall72hMm}mm (72h)
                      </div>
                    </div>

                    <div style={{
                      padding: '8px 10px',
                      borderRadius: '8px',
                      background: compoundRisk.compoundRiskScore >= 70 ? 'rgba(239, 68, 68, 0.16)' : 'rgba(245, 158, 11, 0.16)',
                      border: `1px solid ${compoundRisk.compoundRiskScore >= 70 ? 'rgba(239, 68, 68, 0.45)' : 'rgba(245, 158, 11, 0.45)'}`
                    }}>
                      <div style={{ fontSize: '0.66rem', color: '#fde68a', textTransform: 'uppercase', fontWeight: 700 }}>
                        Compound Multi-Hazard Score
                      </div>
                      <div style={{
                        fontSize: '1.2rem',
                        fontWeight: 900,
                        color: compoundRisk.compoundRiskScore >= 70 ? '#ef4444' : '#fbbf24',
                        marginTop: '2px'
                      }}>
                        {compoundRisk.compoundRiskScore}% <span style={{ fontSize: '0.68rem' }}>({compoundRisk.compoundRiskLevel.replace('_COMPOUND', '')})</span>
                      </div>
                      <div style={{ fontSize: '0.65rem', color: '#cbd5e1' }}>
                        Wind: {compoundRisk.cycloneWindExposureKmh} km/h • {compoundRisk.surgeExposureTier.replace(/_/g, ' ')}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3-Layer Super-Stack Drivers */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '7px', marginBottom: '12px' }}>
                  {(compoundRisk.compoundDrivers || []).map((drv, idx) => (
                    <div key={idx} style={{
                      padding: '8px 10px',
                      borderRadius: '8px',
                      background: 'rgba(8, 12, 22, 0.65)',
                      border: '1px solid rgba(255,255,255,0.06)',
                      fontSize: '0.72rem'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, color: '#e2e8f0' }}>
                        <span>{drv.layer}</span>
                        <span style={{ color: '#38bdf8' }}>+{drv.contributionPct} pts</span>
                      </div>
                      <div style={{ fontSize: '0.68rem', color: '#fbbf24', fontWeight: 700, margin: '2px 0' }}>
                        {drv.metric}
                      </div>
                      <div style={{ fontSize: '0.66rem', color: '#94a3b8' }}>
                        {drv.detail}
                      </div>
                    </div>
                  ))}
                </div>

                <div style={{
                  padding: '9px 11px',
                  borderRadius: '8px',
                  background: 'rgba(2, 132, 199, 0.1)',
                  border: '1px solid rgba(56, 189, 248, 0.22)',
                  fontSize: '0.71rem',
                  color: '#e2e8f0',
                  lineHeight: 1.45,
                  marginBottom: '10px'
                }}>
                  <strong>Operational Advisory:</strong> {compoundRisk.operationalRecommendation}
                </div>

                {onSelectLocationForFloodPredict && (
                  <button
                    onClick={() => onSelectLocationForFloodPredict({
                      name: compoundRisk.targetLocation.split(',')[0].trim(),
                      country: 'India',
                      lat: compoundRisk.latitude,
                      lng: compoundRisk.longitude,
                      r24: compoundRisk.cycloneInducedRainfall24hMm,
                      r72: compoundRisk.cycloneInducedRainfall72hMm,
                      wind: compoundRisk.cycloneWindExposureKmh,
                      pressure: ev?.minCentralPressureHpa || 985,
                      elev: compoundRisk.elevationM,
                      temp: 27.0,
                      hum: 92.0,
                      isRaining: true,
                      currentRainfall: Math.round(compoundRisk.cycloneInducedRainfall24hMm / 16)
                    })}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: '8px',
                      background: '#0284c7',
                      border: '1px solid #38bdf8',
                      color: '#ffffff',
                      fontSize: '0.75rem',
                      fontWeight: 800,
                      cursor: 'pointer'
                    }}
                  >
                    🔬 Open {compoundRisk.targetLocation.split(',')[0]} in 15-Feature Flood ML Studio →
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* PROVENANCE & SAFETY DISCLAIMER BANNER */}
      {prov && (
        <div style={{
          marginTop: '18px',
          padding: '12px 16px',
          borderRadius: '10px',
          background: 'rgba(15, 23, 42, 0.75)',
          border: '1px solid rgba(255,255,255,0.08)',
          fontSize: '0.72rem',
          color: '#94a3b8',
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          gap: '8px'
        }}>
          <div>
            <strong style={{ color: '#cbd5e1' }}>Authoritative Provenance:</strong> {prov.bulletinAuthority} ({prov.sourceName}) — {prov.disclaimer}
          </div>
          <div>
            Bulletin Timestamp: <strong style={{ color: '#38bdf8' }}>{prov.sourceIssuedAt}</strong>
          </div>
        </div>
      )}
    </div>
  );
}
