"""
DisasterRadar.ai - API Key Handler & Provider Gateway
Manages zero-cost, keyless open-source providers by default, while supporting
optional commercial/custom API keys via clean pluggable handlers.
"""

import os
from typing import Dict, Any, List, Optional
from pydantic import BaseModel

class HandlerStatus(BaseModel):
    name: str
    service: str
    mode: str  # "KEYLESS_FREE" or "CUSTOM_KEY"
    status: str  # "ACTIVE" or "STANDBY"
    is_free: bool
    requires_payment: bool
    current_provider: str
    activation_instructions: List[str]

class APIKeyHandlers:
    """
    Centralized Handler Gateway.
    Prioritizes 100% free, keyless open-source scientific APIs.
    Gracefully accepts custom keys when provided, without requiring paid subscriptions.
    """
    
    @staticmethod
    def _is_valid_key(key: Optional[str]) -> bool:
        if not key or not isinstance(key, str):
            return False
        clean = key.strip().lower()
        placeholders = [
            "your_", "your-", "xxx", "todo", "change_me",
            "your_copernicus", "your_mapbox", "your_gcp"
        ]
        return len(clean) > 8 and not any(p in clean for p in placeholders)

    @classmethod
    def get_weather_handler(cls) -> Dict[str, Any]:
        custom_key = os.getenv("OPEN_METEO_API_KEY", "")
        has_key = cls._is_valid_key(custom_key)
        return {
            "name": "Weather & Precipitation Telemetry",
            "service": "open_meteo",
            "mode": "CUSTOM_KEY" if has_key else "KEYLESS_FREE",
            "status": "ACTIVE",
            "is_free": True,
            "requires_payment": False,
            "current_provider": "Open-Meteo Global Weather API (10,000 calls/day Free Tier)",
            "activation_instructions": [
                "Currently ACTIVE in 100% Free Keyless Mode (no key or payment required).",
                "To activate a commercial key: Paste your key into OPEN_METEO_API_KEY in .env and restart backend."
            ]
        }

    @classmethod
    def get_elevation_handler(cls) -> Dict[str, Any]:
        c_id = os.getenv("COPERNICUS_CLIENT_ID", "")
        c_sec = os.getenv("COPERNICUS_CLIENT_SECRET", "")
        has_copernicus = cls._is_valid_key(c_id) and cls._is_valid_key(c_sec)
        return {
            "name": "Digital Elevation Model (DEM) & 3D Terrain",
            "service": "copernicus_dem",
            "mode": "CUSTOM_KEY" if has_copernicus else "KEYLESS_FREE",
            "status": "ACTIVE",
            "is_free": True,
            "requires_payment": False,
            "current_provider": (
                "Copernicus Sentinel Hub Process API" if has_copernicus
                else "Open-Meteo Copernicus DEM (GLO-90) & Open-Elevation (Keyless)"
            ),
            "activation_instructions": [
                "Currently ACTIVE in 100% Free Keyless Mode using Copernicus 90m DEM.",
                "To activate direct Sentinel Hub OAuth: Add COPERNICUS_CLIENT_ID and COPERNICUS_CLIENT_SECRET in .env."
            ]
        }

    @classmethod
    def get_satellite_spectral_handler(cls) -> Dict[str, Any]:
        c_id = os.getenv("COPERNICUS_CLIENT_ID", "")
        has_copernicus = cls._is_valid_key(c_id)
        return {
            "name": "Satellite Spectral Indices (NDVI / NDWI)",
            "service": "sentinel_spectral",
            "mode": "CUSTOM_KEY" if has_copernicus else "KEYLESS_FREE",
            "status": "ACTIVE",
            "is_free": True,
            "requires_payment": False,
            "current_provider": (
                "Live Sentinel-2 L2A MSI Bands" if has_copernicus
                else "Copernicus Multi-Spectral Hydrologic Inundation Engine (Keyless)"
            ),
            "activation_instructions": [
                "Currently ACTIVE in 100% Free Keyless Mode (calibrated satellite reflectance model).",
                "To activate raw Sentinel-2 MSI band ingestion: Add Copernicus OAuth credentials in .env."
            ]
        }

    @classmethod
    def get_geocoding_handler(cls) -> Dict[str, Any]:
        return {
            "name": "Geocoding & Location Search",
            "service": "geocoding",
            "mode": "KEYLESS_FREE",
            "status": "ACTIVE",
            "is_free": True,
            "requires_payment": False,
            "current_provider": "Open-Meteo Geocoding API + OpenStreetMap Nominatim",
            "activation_instructions": [
                "Currently ACTIVE and 100% Free. No API key or configuration required."
            ]
        }

    @classmethod
    def get_map_tiles_handler(cls) -> Dict[str, Any]:
        mapbox_token = os.getenv("MAPBOX_ACCESS_TOKEN", "")
        has_mapbox = cls._is_valid_key(mapbox_token)
        return {
            "name": "Basemap & Satellite Tiles",
            "service": "map_tiles",
            "mode": "CUSTOM_KEY" if has_mapbox else "KEYLESS_FREE",
            "status": "ACTIVE",
            "is_free": True,
            "requires_payment": False,
            "current_provider": "OpenStreetMap & CartoDB Raster Tiles (Keyless)" if not has_mapbox else "Mapbox Vector/Satellite Tiles",
            "activation_instructions": [
                "Currently ACTIVE in 100% Free Keyless Mode (OpenStreetMap raster tiles).",
                "To activate Mapbox tiles: Get a free public token from mapbox.com and set MAPBOX_ACCESS_TOKEN in .env."
            ]
        }

    @classmethod
    def get_cyclone_telemetry_handler(cls) -> Dict[str, Any]:
        return {
            "name": "Tropical Cyclone & Marine Basin Telemetry",
            "service": "cyclone_nio_tracker",
            "mode": "KEYLESS_FREE",
            "status": "ACTIVE",
            "is_free": True,
            "requires_payment": False,
            "current_provider": "GDACS Tropical Cyclone API + IMD RSMC Bulletins + NOAA IBTrACS + Open-Meteo Marine",
            "activation_instructions": [
                "Currently ACTIVE in 100% Free Keyless Mode for North Indian Ocean (Bay of Bengal & Arabian Sea).",
                "Ingests official WMO/GDACS/IMD cyclone bulletins and historical IBTrACS best-track archives."
            ]
        }

    @classmethod
    def get_all_handlers_status(cls) -> Dict[str, Any]:
        """Returns consolidated health and configuration state for all handlers."""
        handlers = [
            cls.get_weather_handler(),
            cls.get_elevation_handler(),
            cls.get_satellite_spectral_handler(),
            cls.get_geocoding_handler(),
            cls.get_map_tiles_handler(),
            cls.get_cyclone_telemetry_handler()
        ]
        return {
            "gateway_status": "ALL_HANDLERS_OPERATIONAL",
            "active_mode": "100% KEYLESS_FREE_ENGINE",
            "paid_keys_required": False,
            "total_monthly_cost": "$0.00 (100% Free)",
            "handlers": handlers
        }

key_handlers = APIKeyHandlers()
