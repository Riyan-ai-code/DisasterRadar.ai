"""
Native XGBoost Production Predictor
Loads models/flood_model.json (JSON format, strictly no pickle).
Ingests the 15 domain hydrological features aligned with live Open-Meteo & Copernicus pipelines.
"""

import os
import math
import pandas as pd
import xgboost as xgb
from models.schemas import PredictionInput, PredictionResponse
from datetime import datetime
from config import settings
from services.feature_engineering import (
    build_feature_row,
    classify_risk,
    compute_risk_factors,
    calculate_inundation_physics,
    detect_missing_measurements
)

_xgb_booster = None

def get_xgb_model():
    global _xgb_booster
    model_path = settings.XGB_MODEL_PATH
    if _xgb_booster is None and os.path.exists(model_path):
        try:
            model = xgb.XGBClassifier()
            model.load_model(model_path)
            _xgb_booster = model
            print(f"Loaded native XGBoost model from {model_path}")
        except Exception as e:
            print(f"Error loading native XGBoost model from {model_path}: {e}")
    return _xgb_booster

def predict_flood_risk(params: PredictionInput) -> PredictionResponse:
    model = get_xgb_model()

    if model is not None:
        features = build_feature_row(params)
        sample_df = pd.DataFrame([features])
        prob_raw = float(model.predict_proba(sample_df)[0, 1])
        # Direct probability computed strictly by the trained ML model
        prob_percent = round(min(100.0, max(0.0, prob_raw * 100.0)), 1)
    else:
        # Calibrated fallback if model file is not yet compiled
        r24 = float(params.rainfall24h)
        r72 = float(params.rainfall72h)
        hum = float(params.humidity)
        elev = float(params.elevation)
        press = float(params.pressure)
        score = (r72 / 220.0) * 0.40 + (r24 / 110.0) * 0.30 + ((hum - 50.0) / 50.0) * 0.15
        elev_factor = max(0.0, (1100.0 - elev) / 1100.0)
        score += elev_factor * 0.15
        if press < 1008.0:
            score += ((1008.0 - press) / 20.0) * 0.08
        prob_raw = 1.0 / (1.0 + math.exp(-4.0 * (score - 0.55)))
        prob_percent = round(min(100.0, max(0.0, prob_raw * 100.0)), 1)

    risk_level, risk_class, recommendation = classify_risk(prob_percent)
    risk_factors = compute_risk_factors(params)
    physics = calculate_inundation_physics(params, prob_percent)
    missing = detect_missing_measurements(params)

    return PredictionResponse(
        probability=prob_percent,
        riskLevel=risk_level,
        riskClass=risk_class,
        recommendation=recommendation,
        location=params.location or "Custom Coordinate",
        latitude=params.latitude,
        longitude=params.longitude,
        riskFactors=risk_factors,
        timestamp=datetime.now().isoformat(),
        status="LIVE" if len(missing) < 4 else "SIMULATED",
        telemetrySource="Open-Meteo Global NWP & Copernicus DEM",
        inundationDepthMeters=physics["depth_meters"],
        depthTier=physics["tier_label"],
        depthTierCode=physics["tier_code"],
        flowVelocity=physics["flow_velocity"],
        lifeSafetyDirective=physics["life_safety_directive"],
        missingMeasurements=missing
    )
