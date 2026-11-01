"""
DisasterRadar.ai - Centralized Environment & API Token Configuration
Loads configuration from backend/.env or root .env
"""

import os
from pathlib import Path
from dotenv import load_dotenv

# Search for .env in current directory (backend/) or root directory
BASE_DIR = Path(__file__).resolve().parent
ROOT_DIR = BASE_DIR.parent

env_paths = [
    BASE_DIR / ".env",
    ROOT_DIR / ".env"
]

for p in env_paths:
    if p.exists():
        load_dotenv(dotenv_path=p, override=False)

class Settings:
    # 1. Open-Meteo Weather API
    OPEN_METEO_API_KEY: str = os.getenv("OPEN_METEO_API_KEY", "")
    OPEN_METEO_BASE_URL: str = os.getenv("OPEN_METEO_BASE_URL", "https://api.open-meteo.com/v1/forecast")
    OPEN_METEO_ARCHIVE_URL: str = os.getenv("OPEN_METEO_ARCHIVE_URL", "https://archive-api.open-meteo.com/v1/archive")

    # 2. Copernicus Sentinel Hub & DEM
    COPERNICUS_CLIENT_ID: str = os.getenv("COPERNICUS_CLIENT_ID", "")
    COPERNICUS_CLIENT_SECRET: str = os.getenv("COPERNICUS_CLIENT_SECRET", "")
    COPERNICUS_INSTANCE_ID: str = os.getenv("COPERNICUS_INSTANCE_ID", "")
    COPERNICUS_TOKEN_URL: str = os.getenv(
        "COPERNICUS_TOKEN_URL", 
        "https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token"
    )
    SENTINEL_HUB_PROCESS_URL: str = os.getenv(
        "SENTINEL_HUB_PROCESS_URL",
        "https://sh.dataspace.copernicus.eu/api/v1/process"
    )

    # 3. Google Earth Engine & Dynamic World
    GEE_PROJECT_ID: str = os.getenv("GEE_PROJECT_ID", "")
    GEE_SERVICE_ACCOUNT_EMAIL: str = os.getenv("GEE_SERVICE_ACCOUNT_EMAIL", "")
    GEE_PRIVATE_KEY_PATH: str = os.getenv("GEE_PRIVATE_KEY_PATH", "")
    GEE_SERVICE_ACCOUNT_JSON: str = os.getenv("GEE_SERVICE_ACCOUNT_JSON", "")

    # 4. OpenStreetMap / Overpass API
    OSM_OVERPASS_URL: str = os.getenv("OSM_OVERPASS_URL", "https://overpass-api.de/api/interpreter")
    OSM_USER_AGENT: str = os.getenv("OSM_USER_AGENT", "DisasterRadar-FloodRiskAI/1.0")

    # 5. Mapbox / GIS Tiles
    MAPBOX_ACCESS_TOKEN: str = os.getenv("MAPBOX_ACCESS_TOKEN", "")

    # 6. Google Gemini AI Copilot
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    GEMINI_MODEL: str = os.getenv("GEMINI_MODEL", "gemini-3.5-flash-lite")

    # 7. Application Settings
    APP_ENV: str = os.getenv("APP_ENV", "development")
    APP_PORT: int = int(os.getenv("APP_PORT", 8000))
    APP_HOST: str = os.getenv("APP_HOST", "127.0.0.1")
    DEBUG: bool = os.getenv("DEBUG", "True").lower() in ("true", "1", "yes")
    CORS_ORIGINS: list = [
        origin.strip() 
        for origin in os.getenv("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173").split(",")
    ]

    # Database & ML Paths
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./disaster_history.db")
    XGB_MODEL_PATH: str = os.getenv("XGB_MODEL_PATH", str(ROOT_DIR / "models" / "flood_model.json"))
    RF_MODEL_PATH: str = os.getenv("RF_MODEL_PATH", str(ROOT_DIR / "models" / "random_forest_model.json"))
    METRICS_PATH: str = os.getenv("METRICS_PATH", str(ROOT_DIR / "models" / "metrics.json"))
    RF_METRICS_PATH: str = os.getenv("RF_METRICS_PATH", str(ROOT_DIR / "models" / "random_forest_metrics.json"))
    DECISION_THRESHOLD: float = float(os.getenv("DECISION_THRESHOLD", 0.55))

    def get_api_status(self) -> dict:
        """Returns connection readiness status for all external geospatial providers via APIKeyHandlers."""
        try:
            from services.api_key_handlers import key_handlers
            return key_handlers.get_all_handlers_status()
        except Exception as e:
            return {
                "gateway_status": "KEYLESS_FALLBACK_ACTIVE",
                "active_mode": "100% KEYLESS_FREE_ENGINE",
                "error": str(e)
            }

settings = Settings()
