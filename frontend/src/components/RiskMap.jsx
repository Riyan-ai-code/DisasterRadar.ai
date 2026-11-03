import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

export default function RiskMap({ stations, onSelectStation, onOpenMiraMap, activeLocation }) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const activeMarkerRef = useRef(null);

  const initialLat = activeLocation?.lat || 12.9716;
  const initialLng = activeLocation?.lng || 77.5946;

  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return; // Prevent double initialization in React StrictMode

    const map = L.map(mapContainerRef.current, {
      center: [initialLat, initialLng],
      zoom: 11,
      zoomControl: true,
      attributionControl: false
    });

    // OpenStreetMap Clean Tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18,
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Pan to activeLocation whenever it changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !activeLocation || !activeLocation.lat || !activeLocation.lng) return;
    map.flyTo([activeLocation.lat, activeLocation.lng], 11, { duration: 1.0 });

    if (activeMarkerRef.current) {
      activeMarkerRef.current.remove();
    }

    const activeIcon = L.divIcon({
      className: 'active-loc-beacon',
      html: `
        <div style="position:relative; width:30px; height:30px; display:flex; align-items:center; justify-content:center;">
          <div style="position:absolute; width:30px; height:30px; border-radius:50%; background:#38bdf8; opacity:0.4; animation:pulse 1.8s infinite;"></div>
          <div style="width:14px; height:14px; border-radius:50%; background:#0284c7; border:2px solid #ffffff; box-shadow:0 0 10px #38bdf8;"></div>
        </div>
      `,
      iconSize: [30, 30],
      iconAnchor: [15, 15]
    });

    activeMarkerRef.current = L.marker([activeLocation.lat, activeLocation.lng], { icon: activeIcon })
      .addTo(map)
      .bindPopup(`<strong>📍 Active Target Location</strong><br/>${activeLocation.name}`)
      .openPopup();
  }, [activeLocation?.lat, activeLocation?.lng, activeLocation?.name]);

  // Update Markers whenever stations change
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !Array.isArray(stations) || stations.length === 0) return;

    const markers = [];

    stations.forEach(station => {
      let color = '#84cc16'; // low
      if (station.risk === 'moderate') color = '#eab308';
      if (station.risk === 'high') color = '#f97316';
      if (station.risk === 'severe') color = '#ef4444';

      const customIcon = L.divIcon({
        className: 'custom-leaflet-marker',
        html: `<div style="width: 14px; height: 14px; border-radius: 50%; background-color: ${color}; border: 2px solid #ffffff; box-shadow: 0 1px 4px rgba(0,0,0,0.35); cursor: pointer;"></div>`,
        iconSize: [14, 14],
        iconAnchor: [7, 7]
      });

      const marker = L.marker([station.lat, station.lng], { icon: customIcon }).addTo(map);

      // Popup Content
      const popupDiv = document.createElement('div');
      popupDiv.style.fontFamily = 'Inter, sans-serif';
      const isSim = (station.status || '').toUpperCase() === 'SIMULATED';
      popupDiv.innerHTML = `
        <div style="font-weight: 700; font-size: 0.88rem; color: #1e293b; margin-bottom: 2px;">
          ${station.name}
          <span style="font-size: 9px; padding: 1px 5px; border-radius: 3px; margin-left: 4px; font-weight: 800; background: ${isSim ? '#fef3c7' : '#d1fae5'}; color: ${isSim ? '#b45309' : '#047857'};">
            ${isSim ? 'SIMULATED' : 'LIVE'}
          </span>
        </div>
        <div style="font-size: 0.75rem; color: #64748b; margin-bottom: 2px;">
          Risk: <strong style="color: ${color}; text-transform: uppercase;">${station.risk}</strong> (${station.prob}%)
        </div>
        <div style="font-size: 0.72rem; color: #334155; margin-bottom: 2px;">
          🌊 Depth: <strong>${station.inundationDepthMeters !== undefined ? `${station.inundationDepthMeters}m` : '0.0m'}</strong> (${station.depthTier || 'Surface Runoff'})
        </div>
        <div style="font-size: 0.68rem; color: #94a3b8; margin-bottom: 6px;">
          📡 ${station.source || 'Open-Meteo & Copernicus'}
        </div>
      `;

      const loadBtn = document.createElement('button');
      loadBtn.innerText = 'Load Parameters';
      loadBtn.style.cssText = 'padding: 4px 8px; font-size: 0.72rem; background: #1d64d8; color: white; border: none; border-radius: 4px; cursor: pointer;';
      loadBtn.onclick = () => {
        onSelectStation(station);
        marker.closePopup();
      };

      popupDiv.appendChild(loadBtn);
      marker.bindPopup(popupDiv);
      markers.push(marker);
    });

    if (markers.length > 0) {
      if (activeLocation && activeLocation.lat && activeLocation.lng) {
        map.setView([activeLocation.lat, activeLocation.lng], 11);
      } else {
        try {
          const group = L.featureGroup(markers);
          map.fitBounds(group.getBounds().pad(0.12));
        } catch (err) {}
      }
    }

    return () => {
      markers.forEach(m => m.remove());
    };
  }, [stations, onSelectStation, activeLocation]);

  return (
    <div className="card map-card" id="riskMapCard">
      <div className="map-card-header">
        <span className="card-title" style={{ marginBottom: 0 }}>Risk Map</span>
        <button
          onClick={onOpenMiraMap}
          style={{
            background: '#eff6ff',
            color: '#1d64d8',
            border: '1px solid #bfdbfe',
            borderRadius: '6px',
            padding: '4px 10px',
            fontSize: '0.75rem',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '5px'
          }}
        >
          <span>Explore 3D World Globe Flood Radar</span>
          <span>→</span>
        </button>

      </div>

      <div className="map-container-wrapper" style={{ position: 'relative' }}>
        <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }} />

        {(!stations || stations.length === 0) && (
          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(11, 17, 32, 0.88)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            color: '#f8fafc',
            textAlign: 'center',
            padding: '20px'
          }}>
            <div style={{
              width: '38px',
              height: '38px',
              border: '3px solid rgba(56, 189, 248, 0.2)',
              borderTop: '3px solid #38bdf8',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              marginBottom: '12px'
            }} />
            <strong style={{ fontSize: '0.85rem', color: '#f8fafc', letterSpacing: '0.4px' }}>
              INGESTING REAL-TIME REGIONAL HYDRO-STATIONS
            </strong>
            <span style={{ fontSize: '0.74rem', color: '#94a3b8', marginTop: '4px' }}>
              Querying multi-station precipitation, Copernicus DEM and XGBoost inference...
            </span>
          </div>
        )}

        {/* Floating Legend */}
        <div className="map-legend-box">
          <div className="legend-title">Risk Level</div>
          <div className="legend-items">
            <div className="legend-item">
              <span className="legend-dot low"></span>
              <span>Low</span>
            </div>
            <div className="legend-item">
              <span className="legend-dot moderate"></span>
              <span>Moderate</span>
            </div>
            <div className="legend-item">
              <span className="legend-dot high"></span>
              <span>High</span>
            </div>
            <div className="legend-item">
              <span className="legend-dot severe"></span>
              <span>Severe</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
